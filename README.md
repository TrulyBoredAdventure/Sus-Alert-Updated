# SusAlert Updated

SusAlert Updated is a standalone, read-only Alt1 Toolkit application for the Croesus encounter in RuneScape 3. It preserves the encounter alert workflow associated with SusAlert and adds party route guidance, a movable in-game next-special countdown, material tracking, rotten fungus tracking, local persistence, reset integration, and interrupted-run recovery.

All SusAlert-specific runtime scripts, images, sounds, and Alt1 reader bundles needed by this repository are stored locally. The application does not download or evaluate code from the original SusAlert GitHub Pages deployment.

## Features

### Encounter overlay

- Automatic detection of the Croesus boss timer.
- Automatic encounter start and end handling.
- Croesus attack countdowns and visual instructions.
- Movable in-game next-special overlay with a live countdown and compact ASCII pictograms.
- Small, medium, and large overlay sizes.
- Saved overlay position, visibility, and size.
- Optional countdown sounds.
- Manual timer adjustment.
- Middle fungus timer resynchronisation.
- Chat-based attack-phase detection.
- Statue restoration status indicators.
- Crystal Mask status and expiry alert support.
- Standard, compact, statue, and compact-statue Alt1 configurations.

### Party route tracker

- Party sizes of 2, 4, or 8 players.
- Roles appropriate to the selected team size.
- Separate short-runner and long-runner roles for eight-player teams.
- Material and rotten fungus counters with plus and minus controls.
- Remaining gather, delivery, and rotten fungus totals.
- Instructions for gathering, clearing, depositing, withdrawing, moving, poisoning, restoring, and praying.
- Current plot and next destination display.
- Rotten fungus responsibility selection for short runner, long runner, or neither.
- Local saving of settings and route progress.
- Recovery of a recently interrupted active encounter.
- Collapsible route tracker panel.
- Exact undo for the most recently completed route step.
- Reset integration with SusAlert's encounter reset.

## Standalone design

The repository contains local copies of:

- The SusAlert encounter module.
- Route tracker scripts and styles.
- Alt1 base, OCR, chatbox, buff, and boss-timer browser libraries.
- The application icon and interface images.
- Crystal Mask and statue recognition/display images.
- Alert sound files.

The app does not load scripts, styles, images, or sounds from `Raphire/SusAlert` or `raphire.github.io` at runtime. The project repository link on the information page is a normal user-clicked link and is not a runtime dependency.

The Alt1 reader library may use Alt1's internal `https://alt1api/...` bridge while running inside Alt1. That is Alt1's local browser-to-toolkit interface, not a request to the original SusAlert website.

## Requirements

- Alt1 Toolkit.
- RuneScape interface scaling set to 100 percent.
- The boss timer visible and unobstructed.
- Game messages enabled.
- Chat text size of at least 12.
- Local chat timestamps recommended.
- Interface transparency set to 0 percent when statue indicators are used.

## Installation

Enable GitHub Pages for this repository:

1. Open repository settings.
2. Open Pages.
3. Select `Deploy from a branch`.
4. Select the `main` branch and `/(root)` folder.
5. Save and wait for the deployment to finish.

Install the hosted application with:

```text
alt1://addapp/https://trulyboredadventure.github.io/Sus-Alert-Updated/appconfig.json
```

When replacing an older installation, remove the old Alt1 app entry and install it again so Alt1 refreshes the application name, icon, configuration, and cached files.

## Repository upload

Upload every file and folder from this package into the root of the repository. Do not upload the outer extracted folder as another nested directory.

Important folders include:

```text
.github/
assets/
css/
docs/
scripts/
tests/
tools/
vendor/
```

## Usage

1. Open SusAlert Updated in Alt1.
2. Confirm that the app reports that it is looking for or has found the chat box.
3. Select the party size, role, and rotten fungus duty.
4. Enter the Croesus encounter normally.
5. Complete each route action in RuneScape, then confirm that action in the route tracker.
6. Correct counters with the plus and minus controls when needed.
7. Use `Previous step` to undo the latest route action.

### Next-special overlay

1. Open SusAlert settings.
2. Set `Next special` to `Enabled`.
3. Choose the overlay size.
4. Select `Move`.
5. Move the pointer to the desired RuneScape position.
6. Return to settings and select `Set`.

Use `Preview` to show the overlay for six seconds without starting an encounter. Use `Reset` to return it to the default position. The overlay shows one compact pictogram, the special name, and the remaining seconds. It follows the existing SusAlert timer adjustments, core pauses, and middle-fungus resynchronisation.

The route tracker does not read inventory contents. Its automatic counter changes are based on the expected result of each action confirmed by the player.

## Local storage

Route tracker state is stored under:

```text
susAlert.routeTracker.v1
```

Existing SusAlert settings use their original `sus...` local-storage keys. The next-special overlay uses `susSpecialOverlayEnabled`, `susSpecialOverlaySize`, `susSpecialOverlayX`, and `susSpecialOverlayY`. No route or encounter state is transmitted to an external server by project code.

## Read-only boundary

The application reads permitted screen pixels and game-state information, displays guidance, and stores settings locally. It does not:

- Click or move the RuneScape client mouse.
- Send keyboard input to RuneScape.
- Select objects, patches, statues, targets, menus, or abilities.
- Read or modify RuneScape process memory.
- Alter game packets.
- Perform gameplay actions for the player.

During placement only, the app reads Alt1's current in-game pointer position. It uses that read-only information to preview the selected location and never sends an input event.

The Alt1 permission declaration remains:

```text
pixel,gamestate,overlay
```

## Testing

Run all static and automated checks with a current Node.js installation:

```bash
npm run check
```

Run only automated tests:

```bash
npm test
```

Run only repository verification:

```bash
npm run verify
```

The checks cover route progression, counter totals, undo, persistence, interrupted-run recovery, encounter hooks, next-special timing, overlay drawing, placement controls, local asset references, app configurations, duplicate element IDs, script syntax, read-only boundaries, and absence of the old remote loader.

## Project structure

```text
assets/                 Local icon, interface images, statue images, and sounds
css/style.css           Main encounter and settings styles
css/tracker.css         Responsive route tracker styles
docs/                   Design, compliance, audit, and release notes
scripts/script.js       Local standalone encounter module
scripts/settings.js     Settings-window integration
scripts/special-overlay.js Movable next-special game overlay
scripts/tracker-core.js Route definitions and state model
scripts/tracker.js      Route tracker UI and encounter lifecycle hooks
tests/                  Automated tests and layout evidence
tools/verify-update.js  Repository and standalone-runtime audit
vendor/alt1/            Local Alt1 browser reader builds
appconfig*.json         Alt1 application configurations
index.html              Main application page
```

## Credits

Original SusAlert was created by Raphire and released under the MIT License.

The original project credits ZeroGwafa for chat detection work and Skillbert for creating Alt1 and assisting with boss timer detection.

The route tracker, responsive layout, persistence, recovery, tests, and standalone packaging were added for SusAlert Updated. See `NOTICE.md` and `THIRD_PARTY_NOTICES.md`.

## License

Project code derived from SusAlert is distributed under the MIT License. See `LICENSE` for the complete text. Third-party files in `vendor/` remain subject to their own notices and terms.
