/**
 * The colour scheme toggle (hugo-coder's fixed `.float-container` button) must
 * not cover the footer text.
 *
 * Opens short and long pages in each language at 375px and 1280px, scrolls to
 * the bottom of the page, where the footer comes closest to the fixed button,
 * and asserts that the button's box does not intersect any line of footer text.
 *
 * The bottom of the viewport is saved to FOOTER_SHOTS_DIR
 * (default: test-results/footer-overlap).
 *
 * Requires: see tests/support/site.mjs. Run: node --test tests/
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { REPO, startSite } from "./support/site.mjs";

const SHOTS_DIR = resolve(process.env.FOOTER_SHOTS_DIR ?? join(REPO, "test-results", "footer-overlap"));
const PAGES = [
  { lang: "ja", path: "/", name: "home" },
  { lang: "ja", path: "/portfolio/", name: "portfolio" },
  { lang: "en", path: "/en/", name: "home" },
  { lang: "en", path: "/en/portfolio/", name: "portfolio" },
];
const WIDTHS = [375, 1280];
const SHOT_HEIGHT = 160;

let site;

/** Runs in the page, scrolled to the bottom. Returns the toggle box and the footer text lines it covers. */
function measureFooter() {
  const button = document.querySelector("#dark-mode-toggle")?.getBoundingClientRect();
  const footer = document.querySelector("footer.footer");
  if (!button || !footer) return { found: false };
  const range = document.createRange();
  range.selectNodeContents(footer);
  const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const covered = lines.filter((r) => overlaps(r, button)).map((r) => `text at x=${Math.round(r.left)}..${Math.round(r.right)}, y=${Math.round(r.top)}..${Math.round(r.bottom)}`);
  return { found: true, lines: lines.length, button: `x=${Math.round(button.left)}..${Math.round(button.right)}, y=${Math.round(button.top)}..${Math.round(button.bottom)}`, covered };
}

before(async () => {
  site = await startSite();
  mkdirSync(SHOTS_DIR, { recursive: true });
});

after(() => site?.close());

for (const { lang, path, name } of PAGES) {
  for (const width of WIDTHS) {
    test(`colour scheme toggle does not cover the footer text (${lang} ${name}, ${width}px)`, async () => {
      const { cdp } = site;
      await site.open(path, width);
      await cdp.send("Runtime.evaluate", { expression: "window.scrollTo(0, document.documentElement.scrollHeight)" });

      const { result } = await cdp.send("Runtime.evaluate", { expression: `(${measureFooter})()`, returnByValue: true });
      const m = result.value;

      const scroll = await cdp.send("Runtime.evaluate", { expression: "scrollY", returnByValue: true });
      const viewportBottom = scroll.result.value + 900;
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: viewportBottom - SHOT_HEIGHT, width, height: SHOT_HEIGHT, scale: 1 } });
      writeFileSync(join(SHOTS_DIR, `${lang}-${name}-${width}.png`), Buffer.from(shot.data, "base64"));

      assert.ok(m.found, "toggle or footer not found");
      assert.ok(m.lines > 0, "footer has no text");
      assert.deepEqual(m.covered, [], `toggle at ${m.button} covers footer text`);
    });
  }
}
