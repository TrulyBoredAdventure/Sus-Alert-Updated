(function () {
  "use strict";

  const OVERLAY_STORAGE = {
    x: "susSpecialOverlayX",
    y: "susSpecialOverlayY"
  };
  const OVERLAY_DEFAULTS = { x: 24, y: 118 };

  const definitions = [
    ["tooltipSelect", "susTT", "1", "updateTooltipSetting"],
    ["styleSelect", "susStyle", "0", "updateStyleSetting"],
    ["countdownSoundSelect", "susCountdownSound", "0", "updateCountdownSoundSetting"],
    ["compactModeSelect", "susCompactMode", "1", "updateUISize"],
    ["extendedModeSelect", "susExtendedMode", "1", "updateUISize"],
    ["crystalMaskSelect", "susCMask", "1", "updateCrystalMaskSetting"],
    ["specialOverlaySelect", "susSpecialOverlayEnabled", "1", "reloadSpecialOverlaySettings"],
    ["specialOverlaySizeSelect", "susSpecialOverlaySize", "medium", "reloadSpecialOverlaySettings"],
    ["crystalMaskBorderSelect", "susCMaskBorder", "1", "updateCrystalMaskBorder"],
    ["crystalMaskSoundSelect", "susCMaskSound", "0", "updateAlertSound"],
    ["startDelayInput", "susStartDelay", "0", "updateStartOffset"],
    ["endDelayInput", "susEndCount", "10", "updateEndCountRequired"],
    ["midDelayInput", "susMidDelay", "14", "updateMidOffset"]
  ];

  function callOpener(name, value) {
    try {
      if (window.opener && typeof window.opener[name] === "function") {
        return window.opener[name](value);
      }
    } catch (error) {
      console.warn("SusAlert settings could not notify the main window.", error);
    }
    return undefined;
  }

  function toCoordinate(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.round(number));
  }

  function storedOverlayPosition() {
    return {
      x: toCoordinate(localStorage.getItem(OVERLAY_STORAGE.x), OVERLAY_DEFAULTS.x),
      y: toCoordinate(localStorage.getItem(OVERLAY_STORAGE.y), OVERLAY_DEFAULTS.y)
    };
  }

  function updateCrystalMaskDependencies() {
    const enabled = document.getElementById("crystalMaskSelect").value === "1";
    for (const id of ["crystalMaskBorderSelect", "crystalMaskSoundSelect"]) {
      const element = document.getElementById(id);
      element.disabled = !enabled;
      element.closest(".setting-row").classList.toggle("setting-disabled", !enabled);
    }
  }

  function fillChatboxes() {
    const select = document.getElementById("chatSelect");
    let count = 1;
    try {
      const reader = window.opener && typeof window.opener.getChatReader === "function"
        ? window.opener.getChatReader()
        : null;
      if (reader && reader.pos && Array.isArray(reader.pos.boxes) && reader.pos.boxes.length) {
        count = reader.pos.boxes.length;
      }
    } catch (error) {
      console.warn("SusAlert settings could not read the detected chat boxes.", error);
    }

    select.innerHTML = "";
    for (let index = 0; index < count; index += 1) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = "Chat " + (index + 1);
      select.appendChild(option);
    }
    select.value = localStorage.getItem("susChat") || "0";
    select.addEventListener("change", function () {
      localStorage.setItem("susChat", select.value);
      callOpener("updateChatSetting");
    });
  }

  function initialiseSetting(definition) {
    const id = definition[0];
    const key = definition[1];
    const fallback = definition[2];
    const callback = definition[3];
    const element = document.getElementById(id);
    if (!element) return;

    element.value = localStorage.getItem(key) || fallback;
    element.addEventListener("change", function () {
      if (!element.checkValidity()) return;
      localStorage.setItem(key, element.value);
      if (id === "crystalMaskSelect") updateCrystalMaskDependencies();
      if (id === "specialOverlaySelect") updateSpecialOverlayControls();
      if (id === "specialOverlaySizeSelect") renderSpecialOverlayPreview();
      callOpener(callback, ["countdownSoundSelect", "compactModeSelect", "extendedModeSelect", "crystalMaskBorderSelect", "crystalMaskSoundSelect"].includes(id));
    });
  }

  function setSpecialOverlayStatus(text, stateClass) {
    const status = document.getElementById("specialOverlayStatus");
    if (!status) return;
    status.textContent = text;
    status.classList.remove("is-active", "is-set");
    if (stateClass) status.classList.add(stateClass);
  }

  function renderSpecialOverlayPreview() {
    const preview = document.getElementById("specialOverlayPreview");
    const size = document.getElementById("specialOverlaySizeSelect").value || "medium";
    const enabled = document.getElementById("specialOverlaySelect").value === "1";
    preview.classList.remove("size-small", "size-medium", "size-large", "is-disabled");
    preview.classList.add("size-" + size);
    preview.classList.toggle("is-disabled", !enabled);
  }

  function setLocationInputs(position) {
    const safe = position || storedOverlayPosition();
    document.getElementById("specialOverlayXInput").value = String(toCoordinate(safe.x, OVERLAY_DEFAULTS.x));
    document.getElementById("specialOverlayYInput").value = String(toCoordinate(safe.y, OVERLAY_DEFAULTS.y));
  }

  function syncLocationFromMain(showStatus) {
    const mainSettings = callOpener("getSpecialOverlaySettings");
    const position = mainSettings && Number.isFinite(Number(mainSettings.x)) && Number.isFinite(Number(mainSettings.y))
      ? { x: Number(mainSettings.x), y: Number(mainSettings.y) }
      : storedOverlayPosition();
    setLocationInputs(position);
    if (showStatus) setSpecialOverlayStatus("Location: X " + position.x + ", Y " + position.y + ".", "is-set");
    return position;
  }

  function saveLocationFromInputs() {
    const xInput = document.getElementById("specialOverlayXInput");
    const yInput = document.getElementById("specialOverlayYInput");
    if (!xInput.checkValidity() || !yInput.checkValidity()) {
      setSpecialOverlayStatus("Enter valid X and Y values.", "is-active");
      return;
    }

    const position = {
      x: toCoordinate(xInput.value, OVERLAY_DEFAULTS.x),
      y: toCoordinate(yInput.value, OVERLAY_DEFAULTS.y)
    };
    localStorage.setItem(OVERLAY_STORAGE.x, String(position.x));
    localStorage.setItem(OVERLAY_STORAGE.y, String(position.y));
    const saved = callOpener("setSpecialOverlayPosition", position);
    const finalPosition = saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))
      ? { x: Number(saved.x), y: Number(saved.y) }
      : position;
    setLocationInputs(finalPosition);
    callOpener("reloadSpecialOverlaySettings");
    setSpecialOverlayStatus("Saved: X " + finalPosition.x + ", Y " + finalPosition.y + ".", "is-set");
  }

  function updateSpecialOverlayControls() {
    const enabled = document.getElementById("specialOverlaySelect").value === "1";
    const ids = [
      "specialOverlaySizeSelect",
      "specialOverlayXInput",
      "specialOverlayYInput",
      "saveSpecialOverlayPositionButton",
      "moveSpecialOverlayButton",
      "previewSpecialOverlayButton",
      "resetSpecialOverlayButton"
    ];
    ids.forEach(function (id) {
      const element = document.getElementById(id);
      if (element) element.disabled = !enabled;
    });
    renderSpecialOverlayPreview();

    if (!enabled) {
      callOpener("cancelSpecialOverlayPlacement");
      const move = document.getElementById("moveSpecialOverlayButton");
      const cancel = document.getElementById("cancelSpecialOverlayButton");
      if (move) move.textContent = "Move";
      if (cancel) cancel.classList.add("d-none");
      setSpecialOverlayStatus("Overlay off.");
    } else {
      syncLocationFromMain(true);
    }
  }

  function bindSpecialOverlayControls() {
    const move = document.getElementById("moveSpecialOverlayButton");
    const preview = document.getElementById("previewSpecialOverlayButton");
    const reset = document.getElementById("resetSpecialOverlayButton");
    const cancel = document.getElementById("cancelSpecialOverlayButton");
    const save = document.getElementById("saveSpecialOverlayPositionButton");

    save.addEventListener("click", saveLocationFromInputs);

    move.addEventListener("click", function () {
      const state = callOpener("getSpecialOverlayPlacementState");
      if (state && state.active) {
        const saved = callOpener("finishSpecialOverlayPlacement");
        if (saved) {
          move.textContent = "Move";
          cancel.classList.add("d-none");
          syncLocationFromMain(false);
          setSpecialOverlayStatus("Location set.", "is-set");
        }
        return;
      }

      const started = callOpener("startSpecialOverlayPlacement");
      if (started === false || typeof started === "undefined") {
        setSpecialOverlayStatus("Open settings from SusAlert first.", "is-active");
        return;
      }
      move.textContent = "Set";
      cancel.classList.remove("d-none");
      setSpecialOverlayStatus("Move the pointer, then select Set.", "is-active");
    });

    preview.addEventListener("click", function () {
      const shown = callOpener("previewSpecialOverlay", 6000);
      if (shown === false || typeof shown === "undefined") {
        setSpecialOverlayStatus("Open settings from SusAlert first.", "is-active");
        return;
      }
      setSpecialOverlayStatus("Shown in game for 6 seconds.", "is-set");
    });

    reset.addEventListener("click", function () {
      const settings = callOpener("resetSpecialOverlayPosition");
      if (settings && Number.isFinite(Number(settings.x)) && Number.isFinite(Number(settings.y))) {
        setLocationInputs(settings);
      } else {
        localStorage.setItem(OVERLAY_STORAGE.x, String(OVERLAY_DEFAULTS.x));
        localStorage.setItem(OVERLAY_STORAGE.y, String(OVERLAY_DEFAULTS.y));
        setLocationInputs(OVERLAY_DEFAULTS);
      }
      move.textContent = "Move";
      cancel.classList.add("d-none");
      setSpecialOverlayStatus("Default location restored.", "is-set");
    });

    cancel.addEventListener("click", function () {
      callOpener("cancelSpecialOverlayPlacement");
      move.textContent = "Move";
      cancel.classList.add("d-none");
      syncLocationFromMain(false);
      setSpecialOverlayStatus("Move cancelled.");
    });

    window.setInterval(function () {
      const state = callOpener("getSpecialOverlayPlacementState");
      if (state && state.active) {
        if (state.position) setLocationInputs(state.position);
        setSpecialOverlayStatus(
          "X " + toCoordinate(state.position && state.position.x, OVERLAY_DEFAULTS.x) +
          ", Y " + toCoordinate(state.position && state.position.y, OVERLAY_DEFAULTS.y) +
          ". Select Set.",
          "is-active"
        );
        return;
      }
      if (!cancel.classList.contains("d-none")) {
        move.textContent = "Move";
        cancel.classList.add("d-none");
        syncLocationFromMain(false);
        setSpecialOverlayStatus("Location set.", "is-set");
      }
    }, 250);

    window.addEventListener("beforeunload", function () {
      const state = callOpener("getSpecialOverlayPlacementState");
      if (state && state.active) callOpener("cancelSpecialOverlayPlacement");
    });

    setLocationInputs(storedOverlayPosition());
    updateSpecialOverlayControls();
  }

  function init() {
    fillChatboxes();
    definitions.forEach(initialiseSetting);
    updateCrystalMaskDependencies();
    bindSpecialOverlayControls();
    renderSpecialOverlayPreview();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
