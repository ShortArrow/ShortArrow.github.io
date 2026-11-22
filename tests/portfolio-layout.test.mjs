/**
 * Layout test for the portfolio cards (layouts/shortcodes/portfolio-item.html).
 *
 * Builds the site with Hugo into a temporary directory, serves it over HTTP,
 * opens each portfolio page in headless Chrome at several viewport widths and
 * asserts, for every card:
 *   - every link box lies inside the card's border box;
 *   - each "/" separator between links sits on the same line as, and within 1em of, a link;
 *   - a link wraps mid-URL only when the URL alone is wider than the line.
 *
 * Screenshots of every page and width are written to PORTFOLIO_SHOTS_DIR
 * (default: test-results/portfolio).
 *
 * Requires: see tests/support/site.mjs. Run: node --test tests/
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { REPO, startSite } from "./support/site.mjs";

const SHOTS_DIR = resolve(process.env.PORTFOLIO_SHOTS_DIR ?? join(REPO, "test-results", "portfolio"));

const PAGES = [
  { lang: "ja", path: "/portfolio/" },
  { lang: "en", path: "/en/portfolio/" },
];
const WIDTHS = [1280, 1040, 601, 600, 375];
/** Cards cropped into a separate screenshot: the ones in the reported screenshot. */
const FOCUS_CARDS = process.env.PORTFOLIO_FOCUS?.split(",") ?? ["mblint", "neovim-reverse-lookup"];

let site, cdp;

/** Runs in the page. Returns one entry per card with the violations found. */
function inspectCards() {
  const tol = 1;
  const inside = (r, box) => r.left >= box.left - tol && r.right <= box.right + tol && r.top >= box.top - tol && r.bottom <= box.bottom + tol;
  /** True when the vertical centre of `glyph` falls within the box `r` (a line fragment or an inline-block). */
  const sameLine = (r, glyph) => r.top <= (glyph.top + glyph.bottom) / 2 && (glyph.top + glyph.bottom) / 2 <= r.bottom;
  return [...document.querySelectorAll(".portfolio-item")].map((card) => {
    const title = card.querySelector("h1,h2,h3,h4")?.firstChild?.textContent.trim() ?? "?";
    const box = card.getBoundingClientRect();
    const problems = [];
    let separators = 0;
    const links = [...card.querySelectorAll(".portfolio-item-content p a")];
    /** One rect per line fragment of the link's text, whatever its display type. */
    const lineRects = (a) => {
      const range = document.createRange();
      range.selectNodeContents(a);
      return [...range.getClientRects()].filter((r) => r.width > 0);
    };
    for (const a of links) {
      const rects = [...a.getClientRects(), ...lineRects(a)];
      if (!rects.every((r) => inside(r, box))) problems.push(`link outside card: ${a.href}`);
      const lineWidth = a.closest("p").clientWidth;
      const probe = a.cloneNode(true);
      probe.style.whiteSpace = "nowrap";
      probe.style.maxWidth = "none";
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      a.parentElement.append(probe);
      const natural = probe.getBoundingClientRect().width;
      probe.remove();
      const lines = new Set(lineRects(a).map((r) => Math.round(r.top))).size;
      if (lines > 1 && natural <= lineWidth) problems.push(`link wraps mid-URL though it fits one line (${Math.round(natural)}px <= ${lineWidth}px): ${a.href}`);
    }
    const walker = document.createTreeWalker(card.querySelector(".portfolio-item-content"), NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode()); ) {
      if (n.parentElement.closest("a") || n.data.trim() !== "/") continue;
      if (!n.parentElement.closest("p")?.querySelector("a")) continue;
      {
        separators++;
        const i = n.data.indexOf("/");
        const range = document.createRange();
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const s = range.getBoundingClientRect();
        const em = parseFloat(getComputedStyle(n.parentElement).fontSize);
        const near = links.some((a) => [...a.getClientRects()].some((r) => sameLine(r, s) && Math.min(Math.abs(s.left - r.right), Math.abs(r.left - s.right)) <= em));
        if (!near) problems.push(`"/" is not next to a link (x=${Math.round(s.left)})`);
        if (!inside(s, box)) problems.push(`"/" outside card`);
      }
    }
    return { title, problems, separators };
  });
}

before(async () => {
  site = await startSite();
  cdp = site.cdp;
  mkdirSync(SHOTS_DIR, { recursive: true });
});

after(() => site?.close());

for (const { lang, path } of PAGES) {
  for (const width of WIDTHS) {
    test(`portfolio cards keep links inside and "/" beside them (${lang}, ${width}px)`, async () => {
      await site.open(path, width);

      const { result } = await cdp.send("Runtime.evaluate", { expression: `(${inspectCards})()`, returnByValue: true });
      const cards = result.value;
      assert.ok(cards.length > 0, "no .portfolio-item found");
      assert.ok(cards.reduce((n, c) => n + c.separators, 0) >= 4, "expected link separators were not found");

      const { cssContentSize } = await cdp.send("Page.getLayoutMetrics");
      const shot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: Math.ceil(cssContentSize.height), scale: 1 },
      });
      writeFileSync(join(SHOTS_DIR, `${lang}-${width}.png`), Buffer.from(shot.data, "base64"));

      const focus = await cdp.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const cards = [...document.querySelectorAll(".portfolio-item")].filter((c) => ${JSON.stringify(FOCUS_CARDS)}.includes(c.querySelector("h3")?.firstChild?.textContent.trim()));
          const top = Math.min(...cards.map((c) => c.getBoundingClientRect().top + scrollY)) - 16;
          const bottom = Math.max(...cards.map((c) => c.getBoundingClientRect().bottom + scrollY)) + 16;
          return { top, bottom };
        })()`,
      });
      const { top, bottom } = focus.result.value;
      const crop = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: top, width, height: bottom - top, scale: 1 } });
      writeFileSync(join(SHOTS_DIR, `${lang}-${width}-web-apps.png`), Buffer.from(crop.data, "base64"));

      const failures = cards.filter((c) => c.problems.length).map((c) => `${c.title}: ${c.problems.join("; ")}`);
      assert.deepEqual(failures, []);
    });
  }
}
