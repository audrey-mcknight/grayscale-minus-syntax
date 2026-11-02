import test from "node:test";
import assert from "node:assert/strict";
import { siteOrigin, defaultMode, scriptID } from "./rules.mjs";
import { readFileSync } from "node:fs";

test("only normal web origins can request site access", () => {
  assert.equal(siteOrigin("https://github.com/example/project?q=code"), "https://github.com");
  for (const url of ["chrome://extensions", "file:///private/data", "javascript:alert(1)", "not a url"]) assert.equal(siteOrigin(url), null);
});
test("default rule matches supported domains, without matching lookalikes", () => {
  for (const host of ["x.com", "www.x.com", "twitter.com", "mobile.twitter.com", "lesswrong.com", "www.lesswrong.com"]) assert.equal(defaultMode("https://" + host), "highlights");
  for (const host of ["example.com", "nottwitter.com", "x.com.example.com", "github.com", "notlesswrong.com", "lesswrong.com.example.com"]) assert.equal(defaultMode("https://" + host), "off");
});
test("registration IDs are deterministic and specific to each origin", () => {
  assert.equal(scriptID("https://example.com"), scriptID("https://example.com"));
  assert.notEqual(scriptID("https://example.com"), scriptID("http://example.com"));
  assert.match(scriptID("https://example.com"), /^[A-Za-z0-9_-]+$/);
});

test("tab theme is static, neutral, and distinguishes active from inactive tabs", () => {
  const theme = JSON.parse(readFileSync(new URL("../theme/manifest.json", import.meta.url)));
  assert.ok(!theme.permissions && !theme.background && !theme.content_scripts);
  for (const channels of Object.values(theme.theme.colors)) assert.ok(channels.every((channel) => channel === channels[0]));
  assert.ok(theme.theme.colors.toolbar[0] - theme.theme.colors.frame[0] >= 100);
});
