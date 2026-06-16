const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Core = require('../scripts/tracker-core.js');

const trackerSource = fs.readFileSync(path.join(__dirname, '../scripts/tracker.js'), 'utf8');

function makeStorage(seed) {
  const data = new Map(Object.entries(seed || {}));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    dump() { return Object.fromEntries(data.entries()); }
  };
}

function loadTracker(storage, nowRef) {
  const mount = {
    className: '',
    innerHTML: '',
    addEventListener() {},
    contains() { return true; }
  };
  const calls = { startOffsets: [], stops: 0 };
  const window = {
    SusAlertTrackerCore: Core,
    startEncounter(offset) { calls.startOffsets.push(offset || 0); },
    stopEncounter() { calls.stops += 1; },
    addEventListener() {},
    setInterval() { return 1; }
  };
  const document = {
    readyState: 'complete',
    getElementById(id) { return id === 'routeTrackerMount' ? mount : null; },
    addEventListener() {},
    createElement() { throw new Error('mount should already exist'); },
    body: { appendChild() {} }
  };
  const context = {
    window,
    document,
    localStorage: storage,
    console,
    Date: class extends Date {
      static now() { return nowRef.value; }
    },
    setInterval() { return 1; },
    clearInterval() {}
  };
  context.globalThis = context;
  vm.runInNewContext(trackerSource, context, { filename: 'tracker.js' });
  return { window, document, mount, calls, storage };
}

test('encounter hooks start a new route and reset when SusAlert stops', () => {
  const storage = makeStorage();
  const nowRef = { value: 10_000 };
  const harness = loadTracker(storage, nowRef);

  harness.window.startEncounter(-1500);
  let saved = Core.deserialize(storage.getItem(Core.STORAGE_KEY), nowRef.value);
  assert.equal(saved.progress.active, true);
  assert.equal(saved.progress.startOffsetMs, -1500);
  assert.deepEqual(harness.calls.startOffsets, [-1500]);

  saved = Core.addMaterial(saved, 5);
  storage.setItem(Core.STORAGE_KEY, JSON.stringify(saved));
  harness.window.stopEncounter();
  saved = Core.deserialize(storage.getItem(Core.STORAGE_KEY), nowRef.value);
  assert.equal(saved.progress.active, false);
  assert.equal(saved.progress.materialHeld, 0);
  assert.equal(harness.calls.stops, 1);
});

test('encounter hook recovers saved elapsed time instead of restarting at zero', () => {
  const start = 100_000;
  let savedState = Core.createState(null, start);
  savedState = Core.startEncounter(savedState, start, false);
  savedState.progress.startOffsetMs = -2000;
  savedState = Core.addMaterial(savedState, 9);
  const storage = makeStorage({ [Core.STORAGE_KEY]: JSON.stringify(savedState) });
  const nowRef = { value: start + 120_000 };
  const harness = loadTracker(storage, nowRef);

  harness.window.startEncounter(0);
  const restored = Core.deserialize(storage.getItem(Core.STORAGE_KEY), nowRef.value);
  assert.equal(restored.progress.active, true);
  assert.equal(restored.progress.materialHeld, 9);
  assert.deepEqual(harness.calls.startOffsets, [-122000]);
});
