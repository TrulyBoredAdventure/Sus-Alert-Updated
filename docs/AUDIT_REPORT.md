# Audit Report - 1.3.1

## End-user README

The README now focuses on installing and using the Alt1 app. Maintainer upload, development, test-command, and repository-structure sections were removed. It includes:

- Direct Alt1 installation link.
- Requirements and first-use guidance.
- Encounter and route tracker instructions.
- Overlay setup and location instructions.
- Troubleshooting.
- Privacy and read-only boundaries.
- Original SusAlert credit and MIT licensing.
- A preview image of the next-special overlay.

## Settings overlay controls

The settings page includes:

- An always-visible display preview.
- Small, medium, and large size preview states.
- X and Y location inputs.
- Save control for exact coordinates.
- Move and Set pointer placement.
- Live coordinate feedback while moving.
- Show in game sample control.
- Reset and Cancel controls.

## Runtime integration

The main page now loads the local overlay controller after the encounter module and before the route tracker. No original SusAlert GitHub or CDN runtime call is used.

## Read-only review

Project scripts were checked for network requests, dynamic code execution, and Alt1 input-sending calls. None were found. Overlay placement reads the current pointer position but does not move or click it.
