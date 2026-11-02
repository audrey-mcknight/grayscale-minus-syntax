export const MODES = ["highlights", "media", "all", "off"];

export function siteOrigin(raw) {
  try {
    const url = new URL(raw);
    return ["https:", "http:"].includes(url.protocol) ? url.origin : null;
  } catch { return null; }
}

export function defaultMode(origin) {
  const host = new URL(origin).hostname;
  return /(^|\.)(x\.com|twitter\.com|lesswrong\.com)$/.test(host) ? "highlights" : "off";
}

export function scriptID(origin) {
  return "grayscale_" + btoa(origin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
