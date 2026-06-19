# Audit Report

## Scope

The audit reviewed repository completeness, standalone runtime behavior, local references, application identity, visible text, next-special timing, movable-overlay controls, route generation, read-only boundaries, persistence, reset handling, and tests.

## Standalone result

- No `scripts/legacy-loader.js` file.
- No runtime reference to `raphire.github.io`.
- No runtime reference to `raw.githubusercontent.com/Raphire`.
- No runtime reference to the original GitHub repository.
- No runtime Alt1 CDN script reference.
- Alt1 reader scripts are stored in `vendor/alt1/`.
- Application images and sounds use local relative paths.
- The old network-loader error message is absent.

## Next-special overlay result

- Displays a compact ASCII pictogram, special name, and remaining seconds.
- Uses the encounter module's existing timer, pause, nudge, cycle, and resynchronisation state.
- Stores visibility, size, and RuneScape-relative coordinates locally.
- Provides Move, Set, Cancel, Preview, and Reset controls.
- Clamps the overlay inside the RuneScape client.
- Uses no external image or script dependency.
- Sends no mouse or keyboard input.

## Identity result

All four application configurations use a `SusAlert Updated` display name, local `index.html`, and local `assets/favicon.png`.

The main, settings, and information pages include descriptive HTML titles and the local icon.

## Text and layout result

The route tracker CSS permits wrapping and visible overflow for user-facing labels. Ellipsis clipping is not used for route buttons or destination text. Runtime text contains no Unicode replacement characters. Overlay widths include conservative space for every special name at each supported size.

## Read-only result

Project scripts do not call mouse, keyboard, click, or input-sending Alt1 functions. Overlay placement reads pointer coordinates only. Project scripts do not evaluate downloaded code or make project-level network requests. Alt1's vendored base library uses the internal `https://alt1api/...` capture bridge when running inside Alt1.

## Attribution result

The original MIT copyright and permission notice remain in `LICENSE`. Original SusAlert, ZeroGwafa, and Skillbert credit is retained in the README, notice, information page, and third-party notice.

## Remaining acceptance work

Live Alt1 testing is still required because automated tests cannot reproduce the RuneScape boss timer, chat box, buff bar, game scaling, transparency, multi-monitor coordinates, or Alt1's final overlay font rendering.
