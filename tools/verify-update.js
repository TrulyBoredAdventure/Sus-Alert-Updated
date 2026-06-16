#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const failures = [];
const checks = [];

function pass(message) { checks.push(message); }
function fail(message) { failures.push(message); }
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function exists(file) { return fs.existsSync(path.join(root, file)); }

const required = [
  'index.html', 'settings.html', 'info.html', 'README.md', 'LICENSE',
  'NOTICE.md', 'THIRD_PARTY_NOTICES.md', 'package.json',
  'appconfig.json', 'appconfig_compact.json', 'appconfig_statues.json',
  'appconfig_statues_compact.json', 'css/style.css', 'css/tracker.css',
  'scripts/script.js', 'scripts/settings.js', 'scripts/tracker-core.js',
  'scripts/tracker.js', 'vendor/alt1/base.js', 'vendor/alt1/ocr.js',
  'vendor/alt1/chatbox.js', 'vendor/alt1/buffs.js', 'vendor/alt1/bosstimer.js',
  'assets/favicon.png', 'assets/crystalmask.png', 'assets/settingsbutton.png',
  'assets/infobutton.png'
];
required.forEach((file) => exists(file) ? pass(`required file: ${file}`) : fail(`missing required file: ${file}`));

if (exists('scripts/legacy-loader.js')) fail('scripts/legacy-loader.js must not exist');
else pass('remote legacy loader is absent');

const runtimeProjectFiles = [
  'index.html', 'settings.html', 'css/style.css', 'css/tracker.css',
  'scripts/script.js', 'scripts/settings.js', 'scripts/tracker-core.js', 'scripts/tracker.js',
  'appconfig.json', 'appconfig_compact.json', 'appconfig_statues.json', 'appconfig_statues_compact.json'
];
const forbiddenRemote = /(?:raphire\.github\.io|raw\.githubusercontent\.com\/Raphire|github\.com\/Raphire\/SusAlert|unpkg\.com\/alt1|stackpath\.bootstrapcdn\.com|runeapps\.org\/runeappslib)/i;
for (const file of runtimeProjectFiles) {
  if (!exists(file)) continue;
  const text = read(file);
  if (forbiddenRemote.test(text)) fail(`remote runtime dependency found in ${file}`);
}
if (!failures.some((item) => item.includes('remote runtime dependency'))) pass('no original/CDN runtime dependency in project files');

const index = exists('index.html') ? read('index.html') : '';
const expectedScripts = [
  './vendor/alt1/base.js', './vendor/alt1/ocr.js', './vendor/alt1/chatbox.js',
  './vendor/alt1/buffs.js', './vendor/alt1/bosstimer.js', './scripts/script.js',
  './scripts/tracker-core.js', './scripts/tracker.js'
];
const actualScripts = [...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
if (JSON.stringify(actualScripts) === JSON.stringify(expectedScripts)) pass('runtime script order is correct');
else fail(`unexpected runtime script order: ${JSON.stringify(actualScripts)}`);

function checkLocalReferences(file) {
  const text = read(file);
  const refs = [...text.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|mailto:|alt1:|#)/i.test(ref)) continue;
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    const resolved = path.resolve(path.dirname(path.join(root, file)), clean);
    if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) fail(`${file} references missing local file ${ref}`);
  }
}
['index.html', 'settings.html', 'info.html'].forEach((file) => { if (exists(file)) checkLocalReferences(file); });
if (!failures.some((item) => item.includes('references missing local file'))) pass('HTML local references resolve');

for (const file of ['index.html', 'settings.html', 'info.html', 'tests/ui-harness.html']) {
  if (!exists(file)) continue;
  const ids = [...read(file).matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) fail(`${file} contains duplicate id ${duplicate}`);
}
if (!failures.some((item) => item.includes('duplicate id'))) pass('HTML element IDs are unique');

for (const file of ['appconfig.json', 'appconfig_compact.json', 'appconfig_statues.json', 'appconfig_statues_compact.json']) {
  if (!exists(file)) continue;
  try {
    const config = JSON.parse(read(file));
    if (!String(config.appName || '').startsWith('SusAlert Updated')) fail(`${file} has an unexpected appName`);
    if (config.appUrl !== './index.html') fail(`${file} must use local index.html`);
    if (config.iconUrl !== './assets/favicon.png') fail(`${file} must use the local icon`);
    if (config.permissions !== 'pixel,gamestate,overlay') fail(`${file} has unexpected permissions`);
    if (!(config.minWidth <= config.defaultWidth && config.defaultWidth <= config.maxWidth)) fail(`${file} width range is invalid`);
    if (!(config.minHeight <= config.defaultHeight && config.defaultHeight <= config.maxHeight)) fail(`${file} height range is invalid`);
  } catch (error) {
    fail(`${file} is invalid JSON: ${error.message}`);
  }
}
if (!failures.some((item) => item.includes('appconfig'))) pass('Alt1 configurations are valid');

const pngFiles = [
  'assets/favicon.png', 'assets/crystalmask.png', 'assets/settingsbutton.png', 'assets/infobutton.png',
  ...fs.readdirSync(path.join(root, 'assets/statues')).map((name) => `assets/statues/${name}`)
];
for (const file of pngFiles) {
  if (!exists(file)) { fail(`missing image ${file}`); continue; }
  const data = fs.readFileSync(path.join(root, file));
  if (data.length < 100 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') fail(`invalid PNG ${file}`);
}
if (!failures.some((item) => item.includes('PNG') || item.includes('missing image'))) pass('local PNG assets are valid');

const requiredSounds = ['alert','beep','beeps','bell','damage','fireball','race1','race2','shatter','shatter2','softbeep','softendbeep','spell','warningend','xylo','xyloend'];
for (const name of requiredSounds) {
  const file = `assets/${name}.mp3`;
  if (!exists(file) || fs.statSync(path.join(root, file)).size < 1000) fail(`missing or invalid sound ${file}`);
}
if (!failures.some((item) => item.includes('sound'))) pass('local sound assets are present');

const projectScripts = ['scripts/script.js', 'scripts/settings.js', 'scripts/tracker-core.js', 'scripts/tracker.js'];
for (const file of projectScripts) {
  if (!exists(file)) continue;
  const source = read(file);
  try { new vm.Script(source, { filename: file }); }
  catch (error) { fail(`${file} syntax error: ${error.message}`); }
  if (/\b(?:eval|Function)\s*\(/.test(source)) fail(`${file} uses dynamic code execution`);
  if (/\bfetch\s*\(|XMLHttpRequest|importScripts\s*\(/.test(source)) fail(`${file} performs a network request`);
  if (/alt1\.(?:mouse|click|key|keyboard|send|press|move)/i.test(source)) fail(`${file} appears to send input`);
}
if (!failures.some((item) => /syntax error|dynamic code|network request|send input/.test(item))) pass('project scripts are syntactically valid and read-only');

const runtimeText = runtimeProjectFiles.filter(exists).map(read).join('\n');
if (runtimeText.includes('\uFFFD')) fail('replacement-character glyph found in runtime text');
else pass('runtime text contains no replacement glyphs');

const trackerCore = require(path.join(root, 'scripts/tracker-core.js'));
for (const size of [2, 4, 8]) {
  const roles = trackerCore.getRoles(size);
  if (!roles.length) fail(`no roles defined for party size ${size}`);
  for (const role of roles) {
    for (const duty of ['none', 'short', 'long']) {
      const state = trackerCore.createState({ settings: { partySize: size, roleId: role.id, rotResponsibility: duty, collapsed: false } });
      const route = trackerCore.currentRoute(state);
      if (!route || !Array.isArray(route.steps) || !route.steps.length) fail(`empty route for ${role.id}/${duty}`);
    }
  }
}
if (!failures.some((item) => item.includes('route'))) pass('all party roles produce routes');

if (failures.length) {
  console.error(`Verification failed with ${failures.length} issue(s):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Verification passed: ${checks.length} checks.`);
checks.forEach((message) => console.log(`- ${message}`));
