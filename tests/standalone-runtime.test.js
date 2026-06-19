const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function scriptSources(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
}

test('main page loads all runtime scripts locally and in dependency order', () => {
  const sources = scriptSources(index);
  assert.deepEqual(sources, [
    './vendor/alt1/base.js',
    './vendor/alt1/ocr.js',
    './vendor/alt1/chatbox.js',
    './vendor/alt1/buffs.js',
    './vendor/alt1/bosstimer.js',
    './scripts/script.js',
    './scripts/special-overlay.js',
    './scripts/tracker-core.js',
    './scripts/tracker.js'
  ]);
  sources.forEach((source) => assert.ok(fs.existsSync(path.join(root, source)), source));
});

test('old remote loader is absent', () => {
  assert.equal(fs.existsSync(path.join(root, 'scripts/legacy-loader.js')), false);
  assert.doesNotMatch(index, /legacy-loader/i);
  assert.doesNotMatch(index, /raphire\.github\.io/i);
  assert.doesNotMatch(index, /unpkg\.com/i);
});

test('all Alt1 app configurations use a local icon and page', () => {
  const files = [
    'appconfig.json', 'appconfig_compact.json',
    'appconfig_statues.json', 'appconfig_statues_compact.json'
  ];
  for (const file of files) {
    const config = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    assert.match(config.appName, /^SusAlert Updated/);
    assert.equal(config.appUrl, './index.html');
    assert.equal(config.iconUrl, './assets/favicon.png');
    assert.equal(config.permissions, 'pixel,gamestate,overlay');
  }
});
