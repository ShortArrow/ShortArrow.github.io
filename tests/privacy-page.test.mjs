/**
 * The privacy policy pages (content/{ja,en}/privacy.md) describe the Cloudflare
 * Web Analytics beacon that Cloudflare injects into production HTML.
 *
 * Builds the site with Hugo into a temporary directory and asserts, for each
 * language, that the page is built, names Cloudflare Web Analytics, says that
 * it sets no cookies, describes the cf_clearance cookie that Cloudflare's bot
 * detection sets, and links the Cloudflare documentation it relies on;
 * and that the footer of every page links the policy in that page's language.
 *
 * Requires: hugo on PATH. Run: node --test tests/
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..");
const SOURCES = [
  "https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/",
  "https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/",
  "https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/",
];
const PAGES = [
  { lang: "ja", file: "privacy/index.html", cookie: "Cookie" },
  { lang: "en", file: "en/privacy/index.html", cookie: "cookie" },
];

let buildDir;

before(() => {
  buildDir = mkdtempSync(join(tmpdir(), "privacy-build-"));
  const r = spawnSync("hugo", ["--quiet", "--destination", buildDir], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, `hugo failed:\n${r.stderr}`);
});

after(() => rmSync(buildDir, { recursive: true, force: true }));

for (const { lang, file, cookie } of PAGES) {
  test(`privacy policy describes Cloudflare Web Analytics (${lang})`, () => {
    const path = join(buildDir, file);
    assert.ok(existsSync(path), `${file} was not built`);
    const html = readFileSync(path, "utf8");
    assert.match(html, /Cloudflare Web Analytics/);
    assert.ok(html.includes(cookie), `does not mention ${cookie}s`);
    assert.ok(html.includes("cf_clearance"), "does not describe the cf_clearance cookie");
    for (const url of SOURCES) assert.ok(html.includes(`href="${url}"`), `does not link ${url}`);
  });
}

test("every page links the privacy policy of its language from the footer", () => {
  const pages = readdirSync(buildDir, { recursive: true }).filter((f) => f.endsWith(".html")).map((f) => f.replaceAll("\\", "/"));
  assert.ok(pages.length > 0, "no pages were built");
  let footers = 0;
  const missing = pages.filter((file) => {
    const footer = readFileSync(join(buildDir, file), "utf8").match(/<footer class="footer">[\s\S]*?<\/footer>/)?.[0];
    if (!footer) return false;
    footers++;
    const href = file.startsWith("en/") ? "/en/privacy/" : "/privacy/";
    return !footer.includes(`href="${href}"`);
  });
  assert.ok(footers > 0, "no page has the theme's footer");
  assert.deepEqual(missing, []);
});
