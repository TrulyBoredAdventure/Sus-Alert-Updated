(function () {
  "use strict";

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

  function updateSpecialOverlayControls() {
    const enabled = document.getElementById("specialOverlaySelect").value === "1";
    const ids = ["specialOverlaySizeSelect", "moveSpecialOverlayButton", "previewSpecialOverlayButton", "resetSpecialOverlayButton"];
    ids.forEach(function (id) {
      const element = document.getElementById(id);
      if (element) element.disabled = !enabled;
    });
    if (!enabled) {
      callOpener("cancelSpecialOverlayPlacement");
      const move = document.getElementById("moveSpecialOverlayButton");
      const cancel = document.getElementById("cancelSpecialOverlayButton");
      if (move) move.textContent = "Move";
      if (cancel) cancel.classList.add("d-none");
      setSpecialOverlayStatus("Overlay off.");
    } else {
      setSpecialOverlayStatus("Move, position, then Set.");
    }
  }

  function bindSpecialOverlayControls() {
    const move = document.getElementById("moveSpecialOverlayButton");
    const preview = document.getElementById("previewSpecialOverlayButton");
    const reset = document.getElementById("resetSpecialOverlayButton");
    const cancel = document.getElementById("cancelSpecialOverlayButton");

    move.addEventListener("click", function () {
      const state = callOpener("getSpecialOverlayPlacementState");
      if (state && state.active) {
        const saved = callOpener("finishSpecialOverlayPlacement");
        if (saved) {
          move.textContent = "Move";
          move.textContent = "Move";
          cancel.classList.add("d-none");
          setSpecialOverlayStatus("Position saved.", "is-set");
        }
        return;
      }

      const started = callOpener("startSpecialOverlayPlacement");
      if (started === false || typeof started === "undefined") {
        setSpecialOverlayStatus("Open settings from Alt1 first.", "is-active");
        return;
      }
      move.textContent = "Set";
      cancel.classList.remove("d-none");
      setSpecialOverlayStatus("Move cursor in game, then Set.", "is-active");
    });

    preview.addEventListener("click", function () {
      callOpener("previewSpecialOverlay", 6000);
      setSpecialOverlayStatus("Preview: 6 seconds.", "is-set");
    });

    reset.addEventListener("click", function () {
      callOpener("resetSpecialOverlayPosition");
      move.textContent = "Move";
      cancel.classList.add("d-none");
      setSpecialOverlayStatus("Position reset.", "is-set");
    });

    cancel.addEventListener("click", function () {
      callOpener("cancelSpecialOverlayPlacement");
      move.textContent = "Move";
      cancel.classList.add("d-none");
      setSpecialOverlayStatus("Move cancelled.");
    });

    window.setInterval(function () {
      const state = callOpener("getSpecialOverlayPlacementState");
      if (!state || !state.active) {
        if (!cancel.classList.contains("d-none")) {
          move.textContent = "Move";
          cancel.classList.add("d-none");
          setSpecialOverlayStatus("Position saved.", "is-set");
        }
      }
    }, 250);

    window.addEventListener("beforeunload", function () {
      const state = callOpener("getSpecialOverlayPlacementState");
      if (state && state.active) callOpener("cancelSpecialOverlayPlacement");
    });

    updateSpecialOverlayControls();
  }

  function init() {
    fillChatboxes();
    definitions.forEach(initialiseSetting);
    updateCrystalMaskDependencies();
    bindSpecialOverlayControls();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
