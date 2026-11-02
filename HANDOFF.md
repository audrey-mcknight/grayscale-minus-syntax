# Agent handoff

## Goal

Standalone open-source macOS app: grayscale the entire Chrome window, including
tabs and toolbar, while keeping actual syntax highlighting in webpages colored.
Keep runtime and battery cost low. This repository contains the standalone app.

## Current state

The native app is based on `brettferdosi/grayscale` (MIT; preserve LICENSE and
the pinned MASShortcut submodule). It uses macOS's system-wide grayscale filter,
defaults to grayscale and gives Terminal, iTerm, Xcode and Chrome color exceptions.
The browser extension and static theme are experimental alternatives, not a complete
solution: per-page style rewriting cannot guarantee every color is gray, and a
Chrome theme cannot guarantee monochrome favicons and every browser control.
The page extension is not installed by these changes; the theme was not visually
verified in Chrome. Run only one system-filter controller at a time.

## Research and recommendation

Start with a **native compositor-layer feasibility test**: show two synthetic
windows, apply a zero-saturation backdrop over one, and punch a clear rectangular
hole. Verify crispness, actual cross-window filtering, hit-testing, window ordering,
scroll/resize alignment, and behavior across displays. Only after it works, connect
an extension that sends code-block rectangles and measure CPU, GPU, and battery
against Chrome without it. Avoid screen capture, recurring full-page scans, and
unbounded work; explicitly report if a private API or permission is required.

The layer and GPU options both use GPU rendering. Their integration differs:

- Native: regional compositor desaturation without screen capture is demonstrated
  by BetterDisplay (https://betterdisplay.pro/guide/interface-reference/app-menu/tools/video-filter-window/).
  On macOS 27.0 (26A428), `research/compositor_probe.swift` created offscreen panels;
  sidebar, under-window and HUD materials exposed `CABackdropLayer` and a
  `colorSaturate` filter whose amount accepted zero. A mask object attached. This
  does **not** verify on-screen appearance, a working hole, cross-window behavior,
  or power usage. Selection material had no backdrop layer. The relevant API is
  private and version-sensitive; do not assume that attaching a mask works visually.
- Chrome GPU/engine: Chromium has compositor effects and selective paint paths
  (https://chromium.googlesource.com/chromium/src.git/+/HEAD/docs/how_cc_works.md and
  https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/platform/graphics/graphics_context.cc).
  There is no demonstrated stock-Chrome extension hook for the complete effect.
  A Chromium change may be necessary, with browser maintenance implications.
  `research/gpu_mask_probe.swift` ran a synthetic 30-sample Metal benchmark on an
  Apple M5: median GPU time about 0.16 ms at 1080p and 4K, both passthrough and
  one-rectangle grayscale. It verified neutral pixels outside and original pixels
  inside. This excludes Chrome access, region tracking, composition, HDR, and battery;
  the synthetic 4K input/output textures used about 66 MB and are not an app estimate.

Code identification is a separate unsolved cost: `<pre>`/`<code>` and user-defined
selectors are hints, not universal semantics. A rectangle preserves all colors inside
it, including backgrounds. Canvas, iframes, zoom, animation, overlapping windows and
rapid scrolling require explicit handling. Do not claim the feature is complete or
that the current prototype has negligible battery impact.

## Checks

Native release build succeeded; browser rule tests and a synthetic Chromium test
verified code/text-highlight preservation, gray CSS colors, existing image blur,
dynamic updates and site modes. A synthetic 1,000-box application took ~80 ms once;
this is not a real-world or battery benchmark. Browser/theme install, exact compositor
behavior and actual Chrome use remain unverified. `make source` builds an allowlisted
archive; verify it contains only the intended public source before publishing.
