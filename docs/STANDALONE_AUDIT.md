# Standalone Runtime Audit

## Result

The application no longer uses the remote encounter loader and does not request scripts, styles, images, or sounds from the original SusAlert deployment.

## Local runtime chain

`index.html` loads the following files from the same repository:

1. `vendor/alt1/base.js`
2. `vendor/alt1/ocr.js`
3. `vendor/alt1/chatbox.js`
4. `vendor/alt1/buffs.js`
5. `vendor/alt1/bosstimer.js`
6. `scripts/script.js`
7. `scripts/tracker-core.js`
8. `scripts/tracker.js`

All interface images, statue images, Crystal Mask assets, and alert sounds use relative local paths.

## Removed failure path

The old `scripts/legacy-loader.js` design has been removed. The message stating that SusAlert could not load the original encounter module is not present in this release.

## Expected Alt1 internal URL

The vendored Alt1 base library contains `https://alt1api/...` bridge URLs. These are handled internally by Alt1 for pixel capture. They are not requests to GitHub, GitHub Pages, RuneApps, or the original SusAlert host.

## User-clicked links

The information page includes a normal link to this updated repository. It opens only when selected by the user and is not required for application startup or operation.
