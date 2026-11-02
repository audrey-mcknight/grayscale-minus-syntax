(() => {
  if (globalThis.__codeFriendlyGrayscale) return;
  globalThis.__codeFriendlyGrayscale = true;
  let style;
  let highlights;
  const origin = location.origin;
  const defaultMode = /(^|\.)(x\.com|twitter\.com|lesswrong\.com)$/.test(location.hostname) ? "highlights" : "off";
  const css = {
    // Low specificity preserves site filters such as sensitive-media blur. Never filter text ancestors.
    media: ":where(img, video, canvas) { filter: grayscale(1); }",
    all: ":root { filter: grayscale(1) !important; }",
    off: "",
  };
  function apply(sites) {
    const setting = sites?.[origin] ?? defaultMode;
    const requested = typeof setting === "string" ? setting : setting.mode;
    const mode = requested === "highlights" || Object.hasOwn(css, requested) ? requested : "off";
    highlights?.stop(); highlights = null;
    if (mode === "off") { style?.remove(); return; }
    if (!document.documentElement) {
      document.addEventListener("DOMContentLoaded", () => apply(sites), { once: true });
      return;
    }
    style ??= document.createElement("style");
    style.dataset.codeFriendlyGrayscale = "true";
    style.textContent = css[mode];
    if (!style.isConnected) document.documentElement.append(style);
    if (mode === "highlights") {
      style.textContent = "";
      const contrast = Math.min(1.4, Math.max(0.85, Number(setting.contrast) || 1));
      highlights = new globalThis.GrayscaleHighlights(contrast);
      highlights.start();
    }
  }
  chrome.storage.local.get("sites").then(({ sites }) => apply(sites)).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.sites) apply(changes.sites.newValue);
  });
})();
