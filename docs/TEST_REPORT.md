# Test Report - 1.3.1

## Result

- Repository verification: 44 checks passed.
- Automated tests: 30 passed.
- JavaScript syntax checks: passed.
- ZIP integrity: passed.

## Overlay coverage

The checks cover:

- Local loading of `scripts/special-overlay.js` in dependency order.
- Next-special icon, name, and countdown drawing.
- Small, medium, and large display sizes.
- Countdown urgency colours.
- Pointer-based Move, Set, and Cancel placement.
- Direct X and Y position saving.
- Position clamping inside the RuneScape client.
- Six-second in-game preview.
- Default-position reset.
- Encounter timing, core pauses, and resynchronisation.
- End-user README preview image and installation link.
- Required settings preview and location controls.

## Route and encounter coverage

The checks also cover:

- Encounter lifecycle hooks.
- Duo, four-player, and eight-player routes.
- Short-runner and long-runner rotten fungus responsibility.
- Material totals and conversions.
- Route completion and exact undo.
- Reset handling.
- Interrupted-run recovery.
- Local asset references and app configurations.
- Absence of remote runtime loaders and input-sending code.
