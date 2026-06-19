const test = require('node:test');
const assert = require('node:assert/strict');
const Overlay = require('../scripts/special-overlay.js');

test('special overlay settings default safely', () => {
  assert.deepEqual(Overlay.normaliseSettings({}), {
    enabled: true,
    size: 'medium',
    x: 24,
    y: 118
  });
  assert.deepEqual(Overlay.normaliseSettings({ enabled: '0', size: 'huge', x: 'bad', y: null }), {
    enabled: false,
    size: 'medium',
    x: 24,
    y: 118
  });
});

test('special overlay position stays inside the RuneScape client', () => {
  assert.deepEqual(Overlay.clampPosition({ x: -50, y: -10 }, 800, 600, 'medium'), { x: 0, y: 0 });
  assert.deepEqual(Overlay.clampPosition({ x: 900, y: 700 }, 800, 600, 'medium'), { x: 620, y: 550 });
});

test('special overlay decodes Alt1 mouse positions', () => {
  const raw = (321 << 16) | 456;
  assert.deepEqual(Overlay.decodeMousePosition(raw), { x: 321, y: 456 });
  assert.equal(Overlay.decodeMousePosition(-1), null);
});

test('special overlay countdown urgency increases near zero', () => {
  assert.deepEqual(Overlay.urgencyRgb(12, [1, 2, 3]), [1, 2, 3]);
  assert.deepEqual(Overlay.urgencyRgb(8, [1, 2, 3]), [255, 230, 92]);
  assert.deepEqual(Overlay.urgencyRgb(4, [1, 2, 3]), [255, 168, 62]);
  assert.deepEqual(Overlay.urgencyRgb(1, [1, 2, 3]), [255, 76, 76]);
});


test('special names fit inside every overlay size', () => {
  const names = ['Red bomb', 'Fairy ring', 'Slimes', 'Yellow bomb', 'Stun', 'Sticky fungi', 'Green bomb', 'Blue bomb', 'Middle fungus'];
  for (const layout of Object.values(Overlay.SIZES)) {
    const available = layout.width - 46;
    for (const name of names) {
      const conservativeWidth = name.length * layout.name * 0.65;
      assert.ok(conservativeWidth <= available, `${name} fits ${layout.width}px overlay`);
    }
  }
});
