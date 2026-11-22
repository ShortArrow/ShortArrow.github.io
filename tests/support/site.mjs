/**
 * Shared harness for browser tests: builds the site with Hugo into a temporary
 * directory, serves it over HTTP and drives headless Chrome through the
 * DevTools protocol.
 *
 * Requires: hugo on PATH, Chrome (CHROME_PATH overrides the default location),
 * Node 22+ (global WebSocket).
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, normalize, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export const REPO = resolve(import.meta.dirname, "..", "..");

const CHROME =
  process.env.CHROME_PATH ??
  ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".json": "application/json", ".xml": "application/xml" };

/**
 * Builds and serves the site and starts Chrome.
 * @returns {Promise<{ baseUrl: string, cdp: { send: Function, once: Function }, open: Function, close: Function }>}
 *   `open(path, width)` loads `path` at `width` CSS px in dark mode and waits for fonts;
 *   `close()` stops everything and removes the temporary directories.
 */
export async function startSite() {
  const buildDir = mkdtempSync(join(tmpdir(), "site-build-"));
  const r = spawnSync("hugo", ["--quiet", "--destination", buildDir], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, `hugo failed:\n${r.stderr}`);

  const server = createServer((req, res) => {
    let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    let file = join(buildDir, p);
    if (!file.startsWith(buildDir)) return res.writeHead(403).end();
    if (p.endsWith("/") || p.endsWith("\\")) file = join(file, "index.html");
    if (!existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  const baseUrl = await new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(`http://127.0.0.1:${server.address().port}`)));

  assert.ok(CHROME, "Chrome not found; set CHROME_PATH");
  const profileDir = mkdtempSync(join(tmpdir(), "site-chrome-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  const portFile = join(profileDir, "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  const port = readFileSync(portFile, "utf8").split("\n")[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((ok, ng) => { ws.onopen = ok; ws.onerror = ng; });
  let id = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, ng } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? ng(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method) {
      for (const w of waiters.filter((w) => w.method === msg.method)) { waiters.splice(waiters.indexOf(w), 1); w.ok(msg.params); }
    }
  };
  const cdp = {
    send: (method, params = {}) => new Promise((ok, ng) => { pending.set(++id, { ok, ng }); ws.send(JSON.stringify({ id, method, params })); }),
    once: (method) => new Promise((ok) => waiters.push({ method, ok })),
  };
  await cdp.send("Page.enable");

  async function open(path, width) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: baseUrl + path });
    await loaded;
    await cdp.send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
    const inner = await cdp.send("Runtime.evaluate", { expression: "innerWidth", returnByValue: true });
    assert.equal(inner.result.value, width, "viewport width was not applied");
  }

  async function close() {
    ws.close();
    chrome.kill();
    server.close();
    await sleep(500);
    for (const d of [buildDir, profileDir]) try { rmSync(d, { recursive: true, force: true }); } catch {}
  }

  return { baseUrl, cdp, open, close };
}
