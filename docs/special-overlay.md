# Next-Special Overlay

The next-special overlay is drawn over the RuneScape client through Alt1. It shows:

- A compact special icon.
- The next Croesus special.
- The remaining seconds.

## Display preview

Open SusAlert settings and find the Game overlay section. The Display preview changes immediately when Small, Medium, or Large is selected. It shows the same layout used by the in-game overlay.

Select `Show in game` to display a six-second sample at the saved location.

## Set the location

### Pointer placement

1. Select `Move`.
2. Move the pointer to the preferred position inside RuneScape.
3. Return to settings.
4. Select `Set`.

Select `Cancel` to keep the previous location.

### Exact coordinates

Enter X and Y under Location in game, then select `Save`.

- X is measured from the left edge of the RuneScape client.
- Y is measured from the top edge of the RuneScape client.

The location is clamped inside the RuneScape client. Select `Reset` to restore the default position.

## Timing

The overlay uses the same encounter state as the main SusAlert panel. It accounts for:

- Automatic encounter start and reset.
- Core attack-phase pauses.
- Manual one-second timer changes.
- Middle-fungus resynchronisation.
- Repeating encounter cycles.

## Read-only operation

During pointer placement, the app reads Alt1's current pointer position inside RuneScape. It does not send mouse or keyboard input.
