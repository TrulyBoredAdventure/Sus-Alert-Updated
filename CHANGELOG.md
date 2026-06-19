# Changelog

## 1.3.0

- Added a movable in-game overlay for the next Croesus special and countdown.
- Added compact ASCII pictograms and urgency colours.
- Added small, medium, and large overlay sizes.
- Added Move, Preview, Reset, and Cancel controls in settings.
- Saved overlay visibility, size, and RuneScape-relative position locally.
- Integrated the overlay with encounter start, reset, core pauses, timer nudges, and middle-fungus resynchronisation.
- Added timing, drawing, placement, and configuration tests.

## 1.2.0

- Converted the application into a standalone repository.
- Removed `scripts/legacy-loader.js` and all runtime calls to the original SusAlert deployment.
- Added a local encounter module with encounter timing, attack alerts, chat parsing, statue tracking, Crystal Mask tracking, settings integration, and reset hooks.
- Vendored the Alt1 base, OCR, chatbox, buff, and boss-timer browser builds.
- Restored local application icon, Crystal Mask image, interface controls, and statue-state images.
- Kept all alert sounds local.
- Retained original SusAlert credit and MIT licensing information.
- Added standalone-runtime tests and repository audits.
- Preserved the party route tracker, local persistence, recovery, reset integration, and undo.

## 1.1.1

- Corrected clipped interface labels and responsive layout behavior.
- Standardised user-facing rotten fungus terminology.
- Added app display names and icon references.

## 1.0.0

- Added the initial party route tracker update.
