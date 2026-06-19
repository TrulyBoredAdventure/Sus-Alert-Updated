/*
 * SusAlert next-special overlay
 *
 * Read-only Alt1 screen overlay. It reads the encounter state exported by
 * scripts/script.js and draws short text with simple ASCII pictograms.
 */
(function (root, factory) {
  "use strict";
  const api = factory(root || null);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SusAlertSpecialOverlay = api;
  if (root && root.document) api.init();
})(typeof window !== "undefined" ? window : null, function (root) {
  "use strict";

  const GROUP = "susalert-next-special";
  const STORAGE = {
    enabled: "susSpecialOverlayEnabled",
    size: "susSpecialOverlaySize",
    x: "susSpecialOverlayX",
    y: "susSpecialOverlayY"
  };
  const DEFAULTS = Object.freeze({ enabled: true, size: "medium", x: 24, y: 118 });
  const SIZES = Object.freeze({
    small: { width: 156, height: 42, icon: 18, name: 13, count: 22, nameY: 4, countY: 18 },
    medium: { width: 180, height: 50, icon: 22, name: 15, count: 27, nameY: 4, countY: 20 },
    large: { width: 210, height: 59, icon: 27, name: 17, count: 33, nameY: 5, countY: 22 }
  });

  let settings = Object.assign({}, DEFAULTS);
  let intervalId = null;
  let placement = null;
  let previewUntil = 0;

  function toFiniteNumber(value, fallback) {
    if (value === null || value === "" || typeof value === "undefined") return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normaliseSettings(value) {
    const source = value || {};
    const size = Object.prototype.hasOwnProperty.call(SIZES, source.size) ? source.size : DEFAULTS.size;
    return {
      enabled: source.enabled !== false && source.enabled !== 0 && source.enabled !== "0",
      size,
      x: Math.round(toFiniteNumber(source.x, DEFAULTS.x)),
      y: Math.round(toFiniteNumber(source.y, DEFAULTS.y))
    };
  }

  function clampPosition(position, clientWidth, clientHeight, sizeName) {
    const layout = SIZES[sizeName] || SIZES.medium;
    const width = Math.max(layout.width, toFiniteNumber(clientWidth, layout.width));
    const height = Math.max(layout.height, toFiniteNumber(clientHeight, layout.height));
    return {
      x: Math.max(0, Math.min(Math.round(toFiniteNumber(position && position.x, DEFAULTS.x)), width - layout.width)),
      y: Math.max(0, Math.min(Math.round(toFiniteNumber(position && position.y, DEFAULTS.y)), height - layout.height))
    };
  }

  function decodeMousePosition(raw) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value === -1) return null;
    return { x: value >>> 16, y: value & 0xFFFF };
  }

  function loadSettings() {
    if (!root || !root.localStorage) return Object.assign({}, DEFAULTS);
    settings = normaliseSettings({
      enabled: root.localStorage.getItem(STORAGE.enabled) === null ? DEFAULTS.enabled : root.localStorage.getItem(STORAGE.enabled),
      size: root.localStorage.getItem(STORAGE.size) || DEFAULTS.size,
      x: root.localStorage.getItem(STORAGE.x),
      y: root.localStorage.getItem(STORAGE.y)
    });
    return Object.assign({}, settings);
  }

  function saveSettings() {
    if (!root || !root.localStorage) return;
    root.localStorage.setItem(STORAGE.enabled, settings.enabled ? "1" : "0");
    root.localStorage.setItem(STORAGE.size, settings.size);
    root.localStorage.setItem(STORAGE.x, String(settings.x));
    root.localStorage.setItem(STORAGE.y, String(settings.y));
  }

  function clearOverlay() {
    if (!root || !root.alt1 || typeof root.alt1.overLayClearGroup !== "function") return;
    try { root.alt1.overLayClearGroup(GROUP); } catch (_) {}
  }

  function canDraw() {
    return !!(
      root && root.alt1 && root.A1lib &&
      typeof root.alt1.overLaySetGroup === "function" &&
      typeof root.alt1.overLayRect === "function" &&
      typeof root.alt1.overLayText === "function" &&
      typeof root.A1lib.mixColor === "function" &&
      root.alt1.rsLinked !== false
    );
  }

  function mix(rgb, alpha) {
    const color = Array.isArray(rgb) ? rgb : [255, 255, 255];
    return root.A1lib.mixColor(color[0], color[1], color[2], alpha === undefined ? 255 : alpha);
  }

  function drawText(text, color, size, x, y, duration) {
    root.alt1.overLayText(String(text), mix([0, 0, 0], 240), size, x + 1, y + 1, duration);
    root.alt1.overLayText(String(text), color, size, x, y, duration);
  }

  function getMousePosition() {
    if (!root || !root.alt1) return null;
    try {
      if (root.A1lib && typeof root.A1lib.getMousePosition === "function") {
        return root.A1lib.getMousePosition();
      }
      return decodeMousePosition(root.alt1["mousePosition"]);
    } catch (_) {
      return null;
    }
  }

  function currentClientPosition() {
    const layout = SIZES[settings.size] || SIZES.medium;
    const position = placement && placement.position ? placement.position : settings;
    return clampPosition(position, root.alt1.rsWidth, root.alt1.rsHeight, settings.size || layout);
  }

  function urgencyRgb(countdown, specialRgb) {
    if (countdown <= 1) return [255, 76, 76];
    if (countdown <= 4) return [255, 168, 62];
    if (countdown <= 8) return [255, 230, 92];
    return specialRgb || [255, 255, 255];
  }

  function previewState() {
    return {
      active: true,
      countdown: 12,
      special: { name: "Red bomb", icon: "*", color: [255, 72, 72] }
    };
  }

  function readEncounterState() {
    if (Date.now() < previewUntil || placement) return previewState();
    if (!root || typeof root.getEncounterOverlayState !== "function") return { active: false };
    try { return root.getEncounterOverlayState(Date.now()) || { active: false }; }
    catch (error) {
      console.warn("SusAlert special overlay could not read encounter state.", error);
      return { active: false };
    }
  }

  function drawFrame() {
    if (!canDraw()) return;
    if (!settings.enabled && !placement && Date.now() >= previewUntil) {
      clearOverlay();
      return;
    }

    const encounter = readEncounterState();
    if (!encounter.active || !encounter.special) {
      clearOverlay();
      return;
    }

    if (placement) updatePlacement();

    const layout = SIZES[settings.size] || SIZES.medium;
    const relative = currentClientPosition();
    const x = Math.round(toFiniteNumber(root.alt1.rsX, 0) + relative.x);
    const y = Math.round(toFiniteNumber(root.alt1.rsY, 0) + relative.y);
    const specialRgb = encounter.special.color || [255, 255, 255];
    const outline = mix(specialRgb, 255);
    const white = mix([255, 255, 255], 255);
    const countdown = Math.max(0, Math.round(toFiniteNumber(encounter.countdown, 0)));
    const countColor = mix(urgencyRgb(countdown, specialRgb), 255);
    const iconX = x + 8;
    const textX = x + 38;
    const duration = 420;
    root.alt1.overLayClearGroup(GROUP);
    root.alt1.overLaySetGroup(GROUP);
    root.alt1.overLayRect(mix([0, 0, 0], 220), x + 1, y + 1, layout.width - 2, layout.height - 2, duration, 4);
    root.alt1.overLayRect(outline, x, y, layout.width, layout.height, duration, 2);
    root.alt1.overLayRect(outline, x + 6, y + 8, 25, 25, duration, 2);
    drawText(encounter.special.icon || "!", outline, layout.icon, iconX + 3, y + 8, duration);
    drawText(encounter.special.name, white, layout.name, textX, y + layout.nameY, duration);
    drawText(String(countdown), countColor, layout.count, textX, y + layout.countY, duration);
    if (placement) drawText("SET", white, 10, x + layout.width - 28, y + layout.height - 14, duration);
  }

  function updatePlacement() {
    if (!placement || !root || !root.alt1) return;
    if (Date.now() >= placement.expiresAt) {
      cancelPlacement();
      return;
    }
    const mouse = getMousePosition();
    if (!mouse) return;
    placement.position = clampPosition(
      { x: mouse.x - 12, y: mouse.y - 12 },
      root.alt1.rsWidth,
      root.alt1.rsHeight,
      settings.size
    );
  }

  function notifyPlacementChange() {
    if (!root || typeof root.dispatchEvent !== "function" || typeof root.CustomEvent !== "function") return;
    try {
      root.dispatchEvent(new root.CustomEvent("susalert-special-overlay-placement", {
        detail: getPlacementState()
      }));
    } catch (_) {}
  }

  function startPlacement() {
    loadSettings();
    if (!canDraw()) return false;
    settings.enabled = true;
    saveSettings();
    placement = {
      position: { x: settings.x, y: settings.y },
      original: { x: settings.x, y: settings.y },
      expiresAt: Date.now() + 120000
    };
    previewUntil = Date.now() + 60000;
    notifyPlacementChange();
    drawFrame();
    return true;
  }

  function finishPlacement() {
    if (!placement || !placement.position) return false;
    settings.x = placement.position.x;
    settings.y = placement.position.y;
    saveSettings();
    placement = null;
    previewUntil = Date.now() + 1800;
    notifyPlacementChange();
    drawFrame();
    return true;
  }

  function cancelPlacement() {
    if (!placement) return false;
    placement = null;
    previewUntil = Date.now() + 1000;
    notifyPlacementChange();
    return true;
  }

  function resetPosition() {
    placement = null;
    settings.x = DEFAULTS.x;
    settings.y = DEFAULTS.y;
    saveSettings();
    previewUntil = Date.now() + 5000;
    notifyPlacementChange();
    drawFrame();
    return getSettings();
  }

  function preview(milliseconds) {
    previewUntil = Date.now() + Math.max(1000, Math.min(15000, toFiniteNumber(milliseconds, 6000)));
    drawFrame();
    return true;
  }

  function reloadSettings() {
    loadSettings();
    if (!settings.enabled && !placement) clearOverlay();
    else drawFrame();
    return getSettings();
  }

  function getSettings() {
    return Object.assign({}, settings);
  }

  function getPlacementState() {
    return {
      active: !!placement,
      position: placement && placement.position ? Object.assign({}, placement.position) : { x: settings.x, y: settings.y }
    };
  }

  function init() {
    if (intervalId !== null || !root) return;
    loadSettings();
    intervalId = root.setInterval(drawFrame, 200);
    if (typeof root.addEventListener === "function") {
      root.addEventListener("beforeunload", clearOverlay);
      root.addEventListener("storage", function (event) {
        const keys = [STORAGE.enabled, STORAGE.size, STORAGE.x, STORAGE.y];
        if (!event || keys.indexOf(event.key) !== -1) reloadSettings();
      });
    }
  }

  const api = {
    STORAGE,
    DEFAULTS,
    SIZES,
    normaliseSettings,
    clampPosition,
    decodeMousePosition,
    urgencyRgb,
    loadSettings,
    reloadSettings,
    getSettings,
    getPlacementState,
    startPlacement,
    finishPlacement,
    cancelPlacement,
    resetPosition,
    preview,
    clearOverlay,
    drawFrame,
    init
  };

  if (root) {
    root.reloadSpecialOverlaySettings = reloadSettings;
    root.getSpecialOverlaySettings = getSettings;
    root.getSpecialOverlayPlacementState = getPlacementState;
    root.startSpecialOverlayPlacement = startPlacement;
    root.finishSpecialOverlayPlacement = finishPlacement;
    root.cancelSpecialOverlayPlacement = cancelPlacement;
    root.resetSpecialOverlayPosition = resetPosition;
    root.previewSpecialOverlay = preview;
  }

  return api;
});
