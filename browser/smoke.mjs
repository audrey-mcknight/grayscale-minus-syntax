/** Uses synthetic pages and a temporary profile; no personal tabs or account data. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const extension = path.dirname(fileURLToPath(import.meta.url));
const profile = await mkdtemp(path.join(os.tmpdir(), "grayscale-code-test-"));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    headless: true, executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  await context.route("https://x.com/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body>
    <code id="syntax" style="color:rgb(170,30,90)">const colorful = true;</code><video id="media"></video>
    <img id="sensitive" style="filter:blur(12px)" alt="blurred media"></body></html>` }));
  await context.route("https://example.test/**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body><video></video><code>Unrelated page</code></body></html>" }));
  await context.route("https://www.lesswrong.com/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body>
    <style>.site-panel {background:rgb(210,40,80);color:rgb(20,150,60);border:3px solid rgb(0,120,240)} .changed{background:rgb(10,130,230)}</style>
    <div id="panel" class="site-panel">Ordinary colored interface</div>
    <article><pre><code><span id="token" style="color:rgb(180,40,90)">const</span> answer = 42;</code></pre>
    <mark id="highlight" style="background-color:rgb(255,235,100);color:rgb(25,35,45)">An important passage</mark>
    <video id="diagram"></video></article></body></html>` }));
  const page = await context.newPage();
  await page.goto("https://x.com/home");
  await page.waitForFunction(() => getComputedStyle(document.querySelector("#media")).filter === "grayscale(1)");
  assert.equal(await page.locator("#syntax").evaluate((code) => getComputedStyle(code).color), "rgb(170, 30, 90)");
  assert.equal(await page.locator("#syntax").evaluate((code) => getComputedStyle(code).filter), "none");
  assert.equal(await page.locator("#sensitive").evaluate((img) => getComputedStyle(img).filter), "blur(12px) grayscale(1)");
  // Discover the extension from the browser's extensions registry (there is intentionally no worker).
  const registry = await context.newPage();
  await registry.goto("chrome://extensions");
  const items = await registry.evaluate(() => new Promise((resolve) => chrome.developerPrivate.getExtensionsInfo({ includeDisabled: false, includeTerminated: false }, resolve)));
  const id = items.find((item) => item.name === "Grayscale · Code Friendly")?.id;
  assert.ok(id, "Extension was loaded");
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  async function mode(value) {
    await popup.evaluate((value) => chrome.storage.local.set({ sites: { "https://x.com": value } }), value);
  }
  await mode("off");
  await page.waitForFunction(() => getComputedStyle(document.querySelector("#media")).filter === "none");
  await mode("all");
  await page.waitForFunction(() => getComputedStyle(document.documentElement).filter === "grayscale(1)");
  await mode("media");
  await page.waitForFunction(() => getComputedStyle(document.documentElement).filter === "none" && getComputedStyle(document.querySelector("#media")).filter === "grayscale(1)");
  await page.reload();
  await page.waitForFunction(() => getComputedStyle(document.querySelector("#media")).filter === "grayscale(1)");
  const unrelated = await context.newPage();
  await unrelated.goto("https://example.test/");
  assert.equal(await unrelated.locator("video").evaluate((video) => getComputedStyle(video).filter), "none");
  assert.equal(await unrelated.locator("style[data-code-friendly-grayscale]").count(), 0);
  const reading = await context.newPage();
  await reading.goto("https://www.lesswrong.com/posts/synthetic-reading-test");
  await reading.waitForFunction(() => getComputedStyle(document.querySelector("#diagram")).filter === "grayscale(1)");
  assert.equal(await reading.locator("#token").evaluate((token) => getComputedStyle(token).color), "rgb(180, 40, 90)");
  assert.equal(await reading.locator("#highlight").evaluate((mark) => getComputedStyle(mark).backgroundColor), "rgb(255, 235, 100)");
  assert.equal(await reading.locator("#highlight").evaluate((mark) => getComputedStyle(mark).color), "rgb(25, 35, 45)");
  assert.ok(await reading.locator("#token").evaluate((token) => {
    for (let element = token; element; element = element.parentElement) if (getComputedStyle(element).filter !== "none") return false;
    return true;
  }), "No code ancestor should be desaturated");
  await popup.evaluate(() => chrome.storage.local.set({ sites: { "https://www.lesswrong.com": { mode: "highlights", contrast: 1 } } }));
  await reading.waitForFunction(() => getComputedStyle(document.querySelector("#panel")).backgroundColor.startsWith("oklch("));
  assert.equal(await reading.locator("#token").evaluate((token) => getComputedStyle(token).color), "rgb(180, 40, 90)");
  assert.equal(await reading.locator("#highlight").evaluate((mark) => getComputedStyle(mark).backgroundColor), "rgb(255, 235, 100)");
  assert.ok(await reading.locator("#panel").evaluate((panel) => {
    const context = document.createElement("canvas").getContext("2d");
    for (const name of ["color", "backgroundColor", "borderTopColor"]) {
      context.fillStyle = getComputedStyle(panel)[name]; context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 1) return false;
    }
    return true;
  }), "Ordinary text, boxes, and borders must become neutral gray");
  await reading.evaluate(() => {
    const div = document.createElement("div"); div.id = "dynamic"; div.style.backgroundColor = "rgb(240,20,60)";
    document.body.append(div);
  });
  await reading.waitForFunction(() => getComputedStyle(document.querySelector("#dynamic")).backgroundColor.startsWith("oklch("));
  await reading.locator("#panel").evaluate((panel) => { panel.classList.add("changed"); });
  await reading.waitForFunction(() => getComputedStyle(document.querySelector("#panel")).backgroundColor.startsWith("oklch("));
  await popup.evaluate(() => chrome.storage.local.set({ sites: { "https://www.lesswrong.com": "off" } }));
  await reading.waitForFunction(() => getComputedStyle(document.querySelector("#panel")).backgroundColor === "rgb(10, 130, 230)");
  assert.equal(await reading.locator("#dynamic").evaluate((element) => element.style.backgroundColor), "rgb(240, 20, 60)");
  await reading.evaluate(() => {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 1000; i++) { const div = document.createElement("div"); div.className = "site-panel"; div.textContent = "Synthetic content " + i; fragment.append(div); }
    document.body.append(fragment);
  });
  const start = performance.now();
  await popup.evaluate(() => chrome.storage.local.set({ sites: { "https://www.lesswrong.com": { mode: "highlights", contrast: 1.15 } } }));
  await reading.waitForFunction(() => getComputedStyle(document.querySelector(".site-panel:last-child")).backgroundColor.startsWith("oklch("));
  console.log("Synthetic 1,000-box highlight mode apply: " + Math.round(performance.now() - start) + " ms end-to-end (not a battery benchmark).");
  assert.equal(await reading.locator("#token").evaluate((token) => getComputedStyle(token).color), "rgb(180, 40, 90)");
  console.log("Browser checks passed: gray media, colored code, preserved text/background highlights, sensitive blur, per-site modes, persistence, unrelated site untouched.");
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
