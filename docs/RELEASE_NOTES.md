# Release Notes - 1.2.0

## Standalone repository release

- Removed the remote original-module loader.
- Added a local encounter module.
- Vendored the Alt1 base, OCR, chatbox, buff, and boss-timer readers.
- Stored all application images, statue images, Crystal Mask assets, and sounds locally.
- Retained original SusAlert credit and the MIT license.
- Preserved route tracker functionality and encounter lifecycle integration.
- Replaced the generic network-loader warning with a local-installation diagnostic.
- Added standalone-runtime verification and encounter-module tests.
- Updated documentation and repository upload instructions.

## Upgrade requirement

Replace the complete repository contents, allow GitHub Pages to redeploy, remove the previous app entry from Alt1, and install it again using the main `appconfig.json` link.
