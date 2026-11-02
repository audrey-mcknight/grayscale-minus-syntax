# Grayscale · Code Friendly

A lightweight macOS menu bar app and browser companion for a quieter screen without losing syntax highlighting.

Grayscale is on by default. iTerm2, Terminal, Xcode, and Chrome start as color exceptions. The browser extension offers experimental page-wide grayscale that preserves code and text highlights, plus a contrast slider. A separate static Chrome theme quiets the tab strip.

## How it works

The Mac app uses the system display filter, switching only when needed as you change apps. Click the menu icon to toggle the saved default. Right-click to set the focused app to Default, Enable Grayscale, or Disable Grayscale (color), or configure the keyboard shortcut. Defaults persist across launches; existing app rules are preserved.

The system filter affects the entire screen. When a color exception is focused, all visible windows are colorful. Different native windows cannot simultaneously use different filters through this implementation.

Keep your browser in color in the Mac app. The extension supplies grayscale within supported pages. Choose a mode per site:

- **Gray page · preserve highlights (experimental)**: neutralizes ordinary CSS text, box colors, borders, shadows, gradients, and media while retaining `pre`, `code`, `mark`, `.hljs`, and `[data-grayscale-preserve]` text/highlights. Includes a page contrast slider (85–140%, saved with Apply).
- **Gray media**: the simpler CSS-only option, leaving all text/interface colors intact.
- **Full grayscale**: one page filter, including highlights.
- **Color**: leave the page alone.

The experimental mode reacts to page changes, restoring original styles when switched off. It has no polling loop or background worker. Layout-only inline animations are ignored. It requires modern CSS relative-color support. Arbitrary shadow DOM, cross-origin frames, pseudo-element artwork, nested gradient syntaxes, browser-internal surfaces, and some complex background imagery are not fully covered. Pages with lots of changing content can cost more work than media-only mode. A local synthetic test of 1,000 colored boxes took about 80 ms to apply once; this is not a battery benchmark or a guarantee for other pages. Media filters preserve existing blur.

This preserves highlighting a website already provides. It does not add a syntax highlighter to unformatted code, and cannot restore color through an enabled system-wide grayscale filter. Code screenshots and canvas-rendered code remain images and become gray.

## Quiet the tab strip

Load the `theme` folder as a separate unpacked Chrome theme. Clear Tabs uses a dark gray frame and a lighter active tab/toolbar, with readable gray text. It is a 717-byte manifest with no running code or permissions. Chrome supports one theme at a time.

Theme APIs cannot remove every browser color: favicons, tab groups, avatars, and some indicators can remain colorful. A page extension cannot style Chrome’s tab strip. The page contrast slider does not change the static browser theme. See [theme details](theme/README.md).

## Build the Mac app

Requires Xcode and macOS 12 or later for this build configuration.

```sh
git clone --recurse-submodules <your-fork-url>
cd grayscale
make app
```

Open `build/Build/Products/Release/grayscale.app`. It is signed for local use; public distribution has not been notarized. Optionally add it to Login Items yourself. The Mac app requires no account, network connection, screen recording, or browser history access. It uses macOS private display APIs inherited from upstream, so OS updates may affect compatibility.

## Install the browser companion

In Chrome, Brave, Arc, or Edge, open the extensions page, enable Developer mode, click Load unpacked, and select the `browser` folder. Pin the extension. Twitter/X and LessWrong start in experimental highlight-preserving mode; reload already-open tabs once after installation.

For any other site, open its page, click the extension, select a mode, and click Apply on this site. Grant access if prompted. The selected site is updated immediately, and future loads retain its rule. Reload other already-open tabs on that site once. Browser internal pages, browser PDF viewers, extension-store pages, and other protected pages may prohibit styling.

The extension initially runs only on Twitter/X and LessWrong. Other site access is optional and requested when you choose a rule. The activeTab permission reads only the tab you invoke the extension on. Site rules live locally. No browsing history, tab inventory, analytics, accounts, cloud sync, recurring timers, screen capture, or AI calls. The extension has no background service worker. See [Chrome’s unpacked-extension instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

Run only one app that controls the system-wide filter at a time.

Native syntax colors are currently tested with Chrome; set your other Chromium browser to Disable Grayscale in the Mac menu before using its companion extension.

## Verify and prepare source

`make test` runs the dependency-free extension rule tests. `browser/smoke.mjs` runs browser integration checks in a fresh synthetic profile; it requires a dev-only Playwright installation and an extension-capable Chromium. Set PLAYWRIGHT_MODULE and CHROMIUM_PATH to reuse local tools.

`make source` creates `build/grayscale-code-friendly-source.zip` from a source allowlist, including dependency source and licenses. It excludes Git metadata, builds, environment files, logs, and unrelated nested workspaces. Nothing is uploaded or published. Battery impact has not been benchmarked.

## Credits and license

Based on [brettferdosi/grayscale](https://github.com/brettferdosi/grayscale) by Brett Gutstein. Original license and credits are preserved in [LICENSE](LICENSE). MASShortcut is included as the original pinned submodule with its own license.
