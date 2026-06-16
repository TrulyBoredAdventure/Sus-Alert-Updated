(function () {
  "use strict";

  const definitions = [
    ["tooltipSelect", "susTT", "1", "updateTooltipSetting"],
    ["styleSelect", "susStyle", "0", "updateStyleSetting"],
    ["countdownSoundSelect", "susCountdownSound", "0", "updateCountdownSoundSetting"],
    ["compactModeSelect", "susCompactMode", "1", "updateUISize"],
    ["extendedModeSelect", "susExtendedMode", "1", "updateUISize"],
    ["crystalMaskSelect", "susCMask", "1", "updateCrystalMaskSetting"],
    ["crystalMaskBorderSelect", "susCMaskBorder", "1", "updateCrystalMaskBorder"],
    ["crystalMaskSoundSelect", "susCMaskSound", "0", "updateAlertSound"],
    ["startDelayInput", "susStartDelay", "0", "updateStartOffset"],
    ["endDelayInput", "susEndCount", "10", "updateEndCountRequired"],
    ["midDelayInput", "susMidDelay", "14", "updateMidOffset"]
  ];

  function callOpener(name, preview) {
    try {
      if (window.opener && typeof window.opener[name] === "function") {
        window.opener[name](preview === true);
      }
    } catch (error) {
      console.warn("SusAlert settings could not notify the main window.", error);
    }
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
      callOpener(callback, ["countdownSoundSelect", "compactModeSelect", "extendedModeSelect", "crystalMaskBorderSelect", "crystalMaskSoundSelect"].includes(id));
    });
  }

  function init() {
    fillChatboxes();
    definitions.forEach(initialiseSetting);
    updateCrystalMaskDependencies();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
