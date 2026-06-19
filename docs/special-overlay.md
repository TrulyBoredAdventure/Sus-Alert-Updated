# Next-Special Overlay

The next-special overlay is drawn directly over the RuneScape client through Alt1's overlay API. It displays:

- One compact ASCII pictogram.
- The next Croesus special name.
- Remaining seconds.

## Positioning

Open settings and select `Move`. The overlay follows the pointer inside RuneScape. Move the pointer to the desired location, return to settings, and select `Set`. The saved coordinates are relative to the RuneScape client, not the desktop, so the overlay remains aligned when the game window moves.

`Preview` displays a six-second example. `Reset` restores the default position. `Cancel` exits placement without changing the saved position.

## Timing

The overlay reads the same encounter state as the main SusAlert panel. It accounts for:

- Automatic encounter start and reset.
- Core attack-phase pauses.
- Manual one-second timer changes.
- Middle-fungus resynchronisation.
- Repeating encounter cycles.

## Read-only operation

During placement, the app reads Alt1's current pointer position in the RuneScape client. It does not send mouse or keyboard input.
