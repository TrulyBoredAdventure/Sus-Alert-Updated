const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../scripts/special-overlay.js'), 'utf8');

function loadOverlay() {
  const calls = [];
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }
  };
  const alt1 = {
    rsLinked: true,
    rsX: 100,
    rsY: 200,
    rsWidth: 1000,
    rsHeight: 700,
    mousePosition: (300 << 16) | 220,
    overLaySetGroup(...args) { calls.push(['group', ...args]); },
    overLayClearGroup(...args) { calls.push(['clear', ...args]); },
    overLayRect(...args) { calls.push(['rect', ...args]); return true; },
    overLayText(...args) { calls.push(['text', ...args]); return true; }
  };
  const window = {
    document: {},
    localStorage,
    alt1,
    A1lib: {
      mixColor(r, g, b, a = 255) { return r + (g << 8) + (b << 16) + (a << 24); },
      getMousePosition() { return { x: 300, y: 220 }; }
    },
    getEncounterOverlayState() {
      return {
        active: true,
        countdown: 12,
        special: { id: 'red-bomb', name: 'Red bomb', icon: '*', color: [255, 72, 72] }
      };
    },
    setInterval() { return 1; },
    addEventListener() {},
    dispatchEvent() {}
  };
  const context = { window, module: undefined, console, Date, Object, Number, Math, String, Array };
  vm.runInNewContext(source, context, { filename: 'special-overlay.js' });
  return { window, calls, storage };
}

test('browser overlay draws a short icon, name, and countdown', () => {
  const { window, calls } = loadOverlay();
  window.SusAlertSpecialOverlay.drawFrame();
  const text = calls.filter((call) => call[0] === 'text').map((call) => call[1]);
  assert.ok(text.includes('*'));
  assert.ok(text.includes('Red bomb'));
  assert.ok(text.includes('12'));
  assert.ok(calls.some((call) => call[0] === 'group' && call[1] === 'susalert-next-special'));
});

test('browser overlay placement previews and saves the selected position', () => {
  const { window, storage } = loadOverlay();
  assert.equal(window.startSpecialOverlayPlacement(), true);
  assert.equal(window.getSpecialOverlayPlacementState().active, true);
  assert.equal(storage.get('susSpecialOverlayEnabled'), '1');
  window.SusAlertSpecialOverlay.drawFrame();
  assert.equal(window.finishSpecialOverlayPlacement(), true);
  assert.equal(window.getSpecialOverlayPlacementState().active, false);
  assert.equal(storage.get('susSpecialOverlayX'), '288');
  assert.equal(storage.get('susSpecialOverlayY'), '208');
});

test('browser overlay accepts an exact saved location', () => {
  const { window, storage } = loadOverlay();
  const saved = window.setSpecialOverlayPosition({ x: 444, y: 333 });
  assert.equal(saved.x, 444);
  assert.equal(saved.y, 333);
  assert.equal(storage.get('susSpecialOverlayX'), '444');
  assert.equal(storage.get('susSpecialOverlayY'), '333');
});
