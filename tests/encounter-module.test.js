const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../scripts/script.js'), 'utf8');

function makeElement() {
  const classes = new Set();
  return {
    textContent: '',
    style: {},
    src: '',
    complete: true,
    classList: {
      add(...values) { values.forEach((value) => classes.add(value)); },
      remove(...values) { values.forEach((value) => classes.delete(value)); },
      toggle(value, force) {
        if (force === true) classes.add(value);
        else if (force === false) classes.delete(value);
        else if (classes.has(value)) classes.delete(value);
        else classes.add(value);
      },
      contains(value) { return classes.has(value); }
    },
    addEventListener() {}
  };
}

function loadEncounterModule() {
  const ids = [
    'timerBox', 'incomingBox', 'upcomingBox', 'recalButton', 'body',
    'cMaskImage', 'debugButton', 'plusButton', 'minusButton',
    'OphalmiStatue', 'SanaStatue', 'TaggaStatue', 'VendiStatue',
    'statuesBox', 'hrStatueDivider', 'vrStatueDivider'
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, makeElement()]));
  const window = {
    addEventListener() {},
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout(fn) { fn(); return 1; }
  };
  const document = {
    readyState: 'loading',
    addEventListener() {},
    getElementById(id) { return elements[id] || null; },
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            drawImage() {},
            getImageData() { return { width: 25, height: 25, data: new Uint8ClampedArray(2500) }; }
          };
        }
      };
    }
  };
  class AudioStub {
    constructor(src) { this.src = src; this.volume = 1; }
    play() { return Promise.resolve(); }
  }
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const context = {
    window,
    document,
    localStorage,
    Audio: AudioStub,
    console,
    Date,
    Uint8ClampedArray,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    setTimeout: window.setTimeout
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'script.js' });
  return { window, elements };
}

test('encounter module exports the lifecycle and settings API expected by the tracker', () => {
  const { window } = loadEncounterModule();
  const required = [
    'startEncounter', 'stopEncounter', 'startAttack', 'endAttack',
    'calculateMidOffset', 'calculateTimeAndUpdateUI', 'nudgeTimer',
    'getChatReader', 'updateChatSetting', 'updateTooltipSetting',
    'updateStyleSetting', 'updateCountdownSoundSetting', 'updateUISize',
    'updateCrystalMaskSetting', 'updateCrystalMaskBorder', 'updateAlertSound',
    'updateStartOffset', 'updateEndCountRequired', 'updateMidOffset'
  ];
  required.forEach((name) => assert.equal(typeof window[name], 'function', name));
});

test('encounter start and stop update the visible panel without a remote module', () => {
  const { window, elements } = loadEncounterModule();
  window.startEncounter(0);
  assert.equal(elements.incomingBox.textContent, 'Encounter started');
  assert.equal(elements.upcomingBox.textContent, 'Next attack: Red bomb');
  window.stopEncounter();
  assert.match(elements.incomingBox.textContent, /Encounter ended/);
  assert.equal(elements.timerBox.textContent, '00:00');
});

test('encounter source contains no remote loader or original deployment dependency', () => {
  assert.doesNotMatch(source, /legacy-loader/i);
  assert.doesNotMatch(source, /raphire\.github\.io/i);
  assert.doesNotMatch(source, /raw\.githubusercontent\.com/i);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\beval\s*\(/);
});
