# Route Tracker Design

The route tracker is a player-controlled extension layered after the local SusAlert encounter module. It attaches to the global `startEncounter()` and `stopEncounter()` lifecycle without changing Alt1 screen-reader permissions or sending input to RuneScape.

## Supported parties

- Two-player Hunter/Woodcutting and Mining/Fishing pairings.
- Four-player skill roles using a 16-material storage and 16-material carry route, moving two plots and then one plot anticlockwise.
- Eight-player skill roles split into one-plot short runners and two-plot long runners.

## State model

The state model is contained in `scripts/tracker-core.js`. It stores:

- Party size and role.
- Rotten fungus responsibility.
- Collapse preference.
- Current route step.
- Current plot and next destination.
- Held, stored, withdrawn, and deposited material.
- Held, collected, and spent rotten fungus.
- Encounter start, save, recovery, and reset state.
- Exact progress snapshots for undo.

## Counter behavior

Counters are workflow-assisted. Confirming a route action applies the expected route change. The app does not recognise inventory contents. Plus and minus controls allow manual correction.

## Recovery

An active encounter is saved locally. If the application is refreshed or reopened while the save remains fresh, the next detected encounter start can restore route progress and preserve the original elapsed-time offset. Stale saves are discarded.

## Reset integration

The tracker wraps the local encounter module's global start and stop functions. Encounter stop resets run progress while preserving party, role, responsibility, and collapse settings.
