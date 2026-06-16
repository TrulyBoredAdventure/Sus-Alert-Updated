const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../scripts/tracker-core.js');

function stepThrough(state, max = 100) {
  let current = state;
  let guard = 0;
  while (Core.currentStep(current) && guard < max) {
    current = Core.performPrimaryAction(current);
    guard += 1;
  }
  assert.ok(guard < max, 'route should complete without an infinite loop');
  return current;
}

test('anticlockwise plot order matches the common Croesus rotation', () => {
  assert.equal(Core.destination('hunter', 1, 'acw'), 'woodcutting');
  assert.equal(Core.destination('hunter', 2, 'acw'), 'mining');
  assert.equal(Core.destination('mining', 1, 'acw'), 'fishing');
  assert.equal(Core.destination('fishing', 1, 'acw'), 'hunter');
  assert.equal(Core.destination('hunter', 1, 'cw'), 'fishing');
});

test('party-size changes select a valid role and reset route progress', () => {
  let state = Core.createState();
  state = Core.addMaterial(state, 7);
  state = Core.updateSettings(state, { partySize: 8 });
  assert.equal(state.settings.partySize, 8);
  assert.ok(Core.getRoles(8).some((role) => role.id === state.settings.roleId));
  assert.equal(state.progress.materialHeld, 0);
  assert.equal(state.progress.stepIndex, 0);
});

test('4-player hunter route is long-two then short-one anticlockwise', () => {
  let state = Core.createState({
    settings: {
      partySize: 4,
      roleId: 'four-hunter',
      rotResponsibility: 'short',
      collapsed: false
    }
  });
  const route = Core.currentRoute(state);
  const moves = route.steps.filter((entry) => entry.type === 'move');
  assert.deepEqual(moves.map((entry) => entry.destination), ['mining', 'fishing']);
  assert.deepEqual(moves.map((entry) => entry.distance), [2, 1]);
  assert.deepEqual(route.totals, { gatherMaterials: 32, deliverMaterials: 32, rot: 10 });
});

test('8-player rot assignment only applies to the selected runner type', () => {
  const shortState = Core.createState({
    settings: {
      partySize: 8,
      roleId: 'eight-hunter-short',
      rotResponsibility: 'short',
      collapsed: false
    }
  });
  const longState = Core.createState({
    settings: {
      partySize: 8,
      roleId: 'eight-hunter-long',
      rotResponsibility: 'short',
      collapsed: false
    }
  });
  assert.equal(Core.currentRoute(shortState).totals.rot, 10);
  assert.equal(Core.currentRoute(longState).totals.rot, 0);
  assert.ok(Core.currentRoute(shortState).steps.some((entry) => entry.type === 'poison'));
  assert.ok(!Core.currentRoute(longState).steps.some((entry) => entry.type === 'poison'));
});

test('material conversion updates held material, held rot, and remaining totals', () => {
  let state = Core.createState();
  state = Core.addMaterial(state, 16);
  state = Core.convertMaterialToRot(state, 3);
  const totals = Core.getTotals(state);
  assert.equal(state.progress.materialHeld, 13);
  assert.equal(state.progress.rotHeld, 3);
  assert.equal(state.progress.gatheredMaterials, 16);
  assert.equal(state.progress.rotCollected, 3);
  assert.equal(totals.gatherMaterialsRemaining, 16);
  assert.equal(totals.rotRemaining, 7);
});

test('4-player route actions update storage, withdrawal, deposits, rot, and completion', () => {
  let state = Core.createState({
    settings: {
      partySize: 4,
      roleId: 'four-hunter',
      rotResponsibility: 'short',
      collapsed: false
    }
  });
  state = stepThrough(state);
  assert.equal(state.progress.completed, true);
  assert.equal(state.progress.gatheredMaterials, 32);
  assert.equal(state.progress.storedMaterials, 16);
  assert.equal(state.progress.withdrawnMaterials, 16);
  assert.equal(state.progress.statueDeposited, 32);
  assert.equal(state.progress.rotSpent, 10);
  assert.equal(state.progress.materialHeld, 0);
  assert.equal(state.progress.rotHeld, 0);
  assert.equal(state.progress.currentPlot, 'fishing');
});

test('duo route gathers and deposits 30 materials and spends 20 rot', () => {
  let state = Core.createState({
    settings: {
      partySize: 2,
      roleId: 'duo-hw',
      rotResponsibility: 'none',
      collapsed: false
    }
  });
  state = stepThrough(state);
  assert.equal(state.progress.completed, true);
  assert.equal(state.progress.gatheredMaterials, 30);
  assert.equal(state.progress.statueDeposited, 30);
  assert.equal(state.progress.rotSpent, 20);
  assert.equal(state.progress.currentPlot, 'fishing');
});

test('active encounters are recoverable within 30 minutes and stale afterward', () => {
  const start = 1_000_000;
  let state = Core.createState(null, start);
  state = Core.startEncounter(state, start, false);
  state.progress.startOffsetMs = -2000;
  const serialized = JSON.stringify(state);

  const recoverable = Core.deserialize(serialized, start + 5 * 60 * 1000);
  assert.equal(recoverable.progress.recoveryPending, true);
  assert.equal(Core.assessRecovery(recoverable, start + 5 * 60 * 1000).recoverable, true);

  const stale = Core.deserialize(serialized, start + 31 * 60 * 1000);
  assert.equal(stale.progress.active, false);
  assert.equal(stale.progress.recoveryPending, false);
});

test('ending an encounter resets route progress but preserves settings', () => {
  let state = Core.createState({
    settings: {
      partySize: 8,
      roleId: 'eight-fishing-long',
      rotResponsibility: 'long',
      collapsed: true
    }
  });
  state = Core.startEncounter(state, 1000, false);
  state = Core.addMaterial(state, 9);
  state = Core.endEncounter(state, 2000);
  assert.equal(state.settings.roleId, 'eight-fishing-long');
  assert.equal(state.settings.collapsed, true);
  assert.equal(state.progress.active, false);
  assert.equal(state.progress.materialHeld, 0);
  assert.equal(state.progress.stepIndex, 0);
});

test('material remaining detects a delivery shortfall after required material is converted', () => {
  let state = Core.createState({
    settings: {
      partySize: 8,
      roleId: 'eight-hunter-short',
      rotResponsibility: 'none',
      collapsed: false
    }
  });
  state = Core.addMaterial(state, 16);
  assert.equal(Core.getTotals(state).gatherMaterialsRemaining, 0);
  state = Core.convertMaterialToRot(state, 1);
  assert.equal(Core.getTotals(state).gatherMaterialsRemaining, 1);
});


test('undo restores the exact progress before the last route action', () => {
  let state = Core.createState({
    settings: {
      partySize: 4,
      roleId: 'four-hunter',
      rotResponsibility: 'short',
      collapsed: false
    }
  });
  state = Core.performPrimaryAction(state); // set held to 16
  const beforeClear = JSON.parse(JSON.stringify(state.progress));
  state = Core.performPrimaryAction(state); // advance gather step (no clear required)
  assert.equal(state.progress.stepIndex, 1);
  state = Core.retreat(state);
  assert.equal(state.progress.stepIndex, beforeClear.stepIndex);
  assert.equal(state.progress.materialHeld, beforeClear.materialHeld);
  assert.equal(state.progress.gatheredMaterials, beforeClear.gatheredMaterials);
});

test('recovery freshness is based on the last save while elapsed time remains encounter-wide', () => {
  const start = 1_000_000;
  const now = start + 45 * 60 * 1000;
  let state = Core.createState(null, start);
  state = Core.startEncounter(state, start, false);
  state.progress.lastSavedAt = now - 2 * 60 * 1000;
  const recovery = Core.assessRecovery(state, now);
  assert.equal(recovery.recoverable, true);
  assert.equal(recovery.ageMs, 2 * 60 * 1000);
  assert.equal(recovery.elapsedMs, 45 * 60 * 1000);
});
