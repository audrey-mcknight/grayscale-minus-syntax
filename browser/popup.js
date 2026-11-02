import { siteOrigin, defaultMode, scriptID } from "./rules.mjs";
const $ = (id) => document.getElementById(id);
let tab, origin;
try {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  origin = siteOrigin(tab?.url);
  if (origin) {
    $("site").textContent = origin;
    const { sites = {} } = await chrome.storage.local.get("sites");
    const rule = sites[origin] ?? defaultMode(origin);
    $("mode").value = typeof rule === "string" ? rule : rule.mode;
    $("contrast").value = typeof rule === "string" ? 100 : Math.round((rule.contrast || 1) * 100);
    $("contrast-value").textContent = $("contrast").value + "%";
    $("apply").disabled = false;
  } else $("site").textContent = "Open a regular website to choose its mode.";
} catch { $("site").textContent = "Could not read this site. Reopen the extension on the website."; }

$("apply").addEventListener("click", async () => {
  const mode = $("mode").value;
  // Browser host permissions cover a host's ports; saved rules remain per origin/port.
  const site = new URL(origin);
  const pattern = site.protocol + "//" + site.hostname + "/*";
  $("apply").disabled = true;
  try {
    // Request access only on an explicit user click, and only for this origin.
    if (mode !== "off" && !await chrome.permissions.request({ origins: [pattern] })) {
      $("status").textContent = "Permission declined. This site's rule was kept.";
      return;
    }
    const id = scriptID(origin);
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (mode !== "off" && !registered.length) {
      await chrome.scripting.registerContentScripts([{ id, matches: [pattern], js: ["highlights.js", "content.js"], runAt: "document_start", persistAcrossSessions: true }]);
    } else if (mode !== "off") {
      await chrome.scripting.updateContentScripts([{ id, js: ["highlights.js", "content.js"] }]);
    } else if (mode === "off" && registered.length) {
      await chrome.scripting.unregisterContentScripts({ ids: [id] });
    }
    const { sites = {} } = await chrome.storage.local.get("sites");
    sites[origin] = { mode, contrast: Number($("contrast").value) / 100 };
    await chrome.storage.local.set({ sites });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["highlights.js", "content.js"] });
    $("status").textContent = "Saved. Reload other already-open tabs on this site once.";
  } catch { $("status").textContent = "Could not apply this rule. Reopen the extension and try again."; }
  finally { $("apply").disabled = false; }
});

$("contrast").addEventListener("input", () => { $("contrast-value").textContent = $("contrast").value + "%"; });
const contrastAvailability = () => { $("contrast").disabled = $("mode").value !== "highlights"; };
$("mode").addEventListener("change", contrastAvailability);
contrastAvailability();
