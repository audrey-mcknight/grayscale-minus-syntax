# Clear Tabs theme

A static grayscale Chrome theme. Dark gray frame/inactive tabs and a lighter active
tab/toolbar distinguish location using luminance contrast. All defined colors are
neutral. No JavaScript, permissions, worker, images, or runtime dependency.

Load this folder as an unpacked theme separately from the browser extension using
the browser's extensions page. Chrome supports one active theme at a time. Revert
through Settings → Appearance → Reset to default. Theme support and rendering can
vary among Chromium browsers.

Chrome's theme API does not offer complete control of all browser surfaces.
Favicons, tab-group colors, profile/avatar images, and some indicators may retain
color. This theme does not claim to desaturate those pixels. A page extension cannot
style Chrome's native tab strip. The extension's contrast slider controls page
colors in highlight-preserving mode; it cannot change this static theme live.

Official theme format: https://developer.chrome.com/docs/extensions/develop/ui/themes
