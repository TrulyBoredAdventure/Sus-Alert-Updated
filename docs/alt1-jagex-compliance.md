# Read-Only Design and Compliance Boundary

SusAlert Updated is designed as an informational Alt1 overlay.

## Permitted operation used by this project

- Screen-pixel capture through Alt1 reader libraries.
- Boss-timer, chatbox, and buff-bar recognition.
- Alt1 overlay rectangles and cursor tooltips.
- Local HTML controls inside the application window.
- Local storage for settings and route progress.
- Local audio playback.

## Actions not performed

The project does not:

- Move or click the RuneScape client mouse.
- Send keyboard input to RuneScape.
- Select objects, patches, statues, targets, menus, abilities, or prayers.
- Read or modify RuneScape process memory.
- Alter game traffic.
- Automate a gameplay action.

Every in-game action remains the player's responsibility. Route changes occur only when the player confirms an action in the Alt1 application window.

## Permissions

All application configurations request:

```text
pixel,gamestate,overlay
```

## Network behavior

Project runtime files do not fetch code or media from the original SusAlert repository or deployment. Alt1's vendored base library contains an internal `https://alt1api/...` bridge used by Alt1 for screen capture. The information page contains a user-clicked repository link, but that link is not needed for startup or operation.

Rules and third-party policies can change. Review current Jagex and Alt1 guidance before future releases.
