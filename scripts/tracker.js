(function () {
  "use strict";

  const Core = window.SusAlertTrackerCore;
  if (!Core) {
    console.error("SusAlert route tracker: tracker-core.js was not loaded.");
    return;
  }

  const STORAGE_KEY = Core.STORAGE_KEY;
  let state = loadState();
  let notice = "";
  let mount = null;
  let originalStartEncounter = null;
  let originalStopEncounter = null;
  let hooksInstalled = false;

  function loadState() {
    return Core.deserialize(localStorage.getItem(STORAGE_KEY), Date.now());
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, Core.serialize(state));
    } catch (error) {
      console.warn("SusAlert route tracker could not save progress.", error);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatAge(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes + ":" + String(remainder).padStart(2, "0");
  }

  function mutate(mutator, message) {
    const copy = JSON.parse(JSON.stringify(state));
    mutator(copy);
    state = Core.createState(copy, Date.now());
    notice = message || "";
    saveState();
    render();
  }

  function resetRouteKeepingEncounter() {
    const wasActive = state.progress.active;
    const startedAt = state.progress.encounterStartedAt;
    const startOffsetMs = state.progress.startOffsetMs;
    const recoveryPending = state.progress.recoveryPending;
    state = Core.resetProgress(state, Date.now());
    state.progress.active = wasActive;
    state.progress.encounterStartedAt = startedAt;
    state.progress.startOffsetMs = startOffsetMs;
    state.progress.recoveryPending = recoveryPending;
    notice = "Route progress reset.";
    saveState();
    render();
  }

  function roleOptions() {
    return Core.getRoles(state.settings.partySize).map(function (role) {
      const selected = role.id === state.settings.roleId ? " selected" : "";
      return '<option value="' + escapeHtml(role.id) + '"' + selected + ">" + escapeHtml(role.label) + "</option>";
    }).join("");
  }

  function partyOptions() {
    return Core.PARTY_SIZES.map(function (size) {
      return '<option value="' + size + '"' + (size === state.settings.partySize ? " selected" : "") + ">" + size + " players</option>";
    }).join("");
  }

  function rotOptions() {
    return Core.ROT_RESPONSIBILITIES.map(function (item) {
      const selected = item.id === state.settings.rotResponsibility ? " selected" : "";
      return '<option value="' + item.id + '"' + selected + ">" + escapeHtml(item.label) + "</option>";
    }).join("");
  }

  function statusHtml() {
    const recovery = Core.assessRecovery(state, Date.now());
    if (state.progress.recoveryPending && recovery.recoverable) {
      return '<div class="route-recovery" role="status">' +
        '<strong>Saved encounter found</strong><br>' +
        'Progress saved ' + escapeHtml(formatAge(recovery.ageMs)) + ' ago will resume when SusAlert detects the boss timer.' +
        '<button type="button" class="nisbutton route-small-button" data-action="discard-recovery">Discard</button>' +
        '</div>';
    }
    if (state.progress.active) return '<span class="route-status route-status-active">Encounter active</span>';
    return '<span class="route-status">Waiting for encounter</span>';
  }

  function counterHtml(kind, label, value) {
    return '<div class="route-counter">' +
      '<span class="route-counter-label">' + escapeHtml(label) + '</span>' +
      '<div class="route-counter-controls">' +
      '<button type="button" class="nissmallimagebutton route-counter-button" data-action="' + kind + '-minus" aria-label="Decrease ' + escapeHtml(label) + '">-</button>' +
      '<output class="route-counter-value" aria-live="polite">' + value + '</output>' +
      '<button type="button" class="nissmallimagebutton route-counter-button" data-action="' + kind + '-plus" aria-label="Increase ' + escapeHtml(label) + '">+</button>' +
      '</div></div>';
  }

  function render() {
    if (!mount) return;
    const route = Core.currentRoute(state);
    const step = Core.currentStep(state);
    const totals = Core.getTotals(state);
    const nextPlot = Core.nextDestination(state);
    const settingsDisabled = state.progress.active ? " disabled" : "";
    const duoRotDisabled = state.settings.partySize === 2 ? " disabled" : settingsDisabled;

    mount.className = "route-tracker" + (state.settings.collapsed ? " route-tracker-collapsed" : "");
    mount.innerHTML =
      '<div class="route-tracker-header">' +
      '<div><strong>Croesus route tracker</strong> ' + statusHtml() + '</div>' +
      '<button type="button" class="nissmallimagebutton route-collapse" data-action="toggle-collapse" aria-expanded="' + (!state.settings.collapsed) + '" title="Collapse or expand route tracker">' + (state.settings.collapsed ? "+" : "-") + '</button>' +
      '</div>' +
      (state.settings.collapsed ? collapsedSummary(route, step, nextPlot) : expandedContent(route, step, totals, nextPlot, settingsDisabled, duoRotDisabled));
  }

  function collapsedSummary(route, step, nextPlot) {
    return '<div class="route-collapsed-summary">' +
      '<span><strong>Current:</strong> ' + escapeHtml(Core.PLOTS[state.progress.currentPlot].label) + '</span>' +
      '<span><strong>Next:</strong> ' + escapeHtml(nextPlot ? Core.PLOTS[nextPlot].label : "Finish") + '</span>' +
      '<span><strong>Instruction:</strong> ' + escapeHtml(step ? step.title : "Route complete") + '</span>' +
      '</div>';
  }

  function expandedContent(route, step, totals, nextPlot, settingsDisabled, duoRotDisabled) {
    const currentPlot = Core.PLOTS[state.progress.currentPlot];
    const primaryDisabled = Core.canPerformPrimaryAction(state) ? "" : " disabled";
    const rotNote = state.settings.partySize === 2
      ? '<div class="route-help">Duo routes prepare 20 rotten fungus and poison both assigned plots.</div>'
      : "";
    const stepNumber = Math.min(state.progress.stepIndex + 1, route.steps.length);

    return '<div class="route-tracker-body">' +
      '<div class="route-settings">' +
      '<label class="route-setting-party">Party size<select id="routePartySize" data-change="party"' + settingsDisabled + '>' + partyOptions() + '</select></label>' +
      '<label class="route-setting-role">Team role<select id="routeRole" data-change="role"' + settingsDisabled + '>' + roleOptions() + '</select></label>' +
      '<label class="route-setting-rot">Rotten fungus duty<select id="routeRot" data-change="rot"' + duoRotDisabled + '>' + rotOptions() + '</select></label>' +
      '</div>' + rotNote +
      '<div class="route-location-grid">' +
      '<div><span class="route-eyebrow">Current plot</span><strong>' + escapeHtml(currentPlot.label) + '</strong></div>' +
      '<div><span class="route-eyebrow">Next destination</span><strong>' + escapeHtml(nextPlot ? Core.PLOTS[nextPlot].label : "Route complete") + '</strong></div>' +
      '</div>' +
      '<div class="route-counter-grid">' +
      counterHtml("material", "Materials held", state.progress.materialHeld) +
      counterHtml("rot", "Rotten fungus held", state.progress.rotHeld) +
      '</div>' +
      '<div class="route-inline-actions">' +
      '<button type="button" class="nisbutton route-small-button" data-action="convert"' + (state.progress.materialHeld < 1 ? " disabled" : "") + '>Convert one material to rotten fungus</button>' +
      '<span>Stored materials: ' + state.progress.storedMaterials + '<br>Statue materials: ' + state.progress.statueDeposited + '</span>' +
      '</div>' +
      '<div class="route-totals">' +
      '<span><b>' + totals.gatherMaterialsRemaining + '</b>Materials left to gather</span>' +
      '<span><b>' + totals.deliverMaterialsRemaining + '</b>Materials left to deliver</span>' +
      '<span><b>' + totals.rotRemaining + '</b>Rotten fungus left</span>' +
      '</div>' +
      '<div class="route-step" aria-live="polite">' +
      '<span class="route-eyebrow">Step ' + stepNumber + ' of ' + route.steps.length + '</span>' +
      '<h3>' + escapeHtml(step ? step.title : "Route complete") + '</h3>' +
      '<p>' + escapeHtml(step ? step.instruction : "Your route is complete. Restore, coordinate the prayer, and follow the team call for the core.") + '</p>' +
      '<div class="route-step-actions">' +
      '<button type="button" class="nisbutton" data-action="primary"' + primaryDisabled + '>' + escapeHtml(Core.primaryActionLabel(state)) + '</button>' +
      '<button type="button" class="nisbutton" data-action="previous"' + (state.progress.history.length === 0 ? " disabled" : "") + '>Undo last step</button>' +
      '</div>' +
      '</div>' +
      '<div class="route-footer">' +
      '<span>' + escapeHtml(route.notes) + '</span>' +
      '<button type="button" class="nisbutton route-small-button" data-action="reset-route">Reset tracker</button>' +
      '</div>' +
      (notice ? '<div class="route-notice" role="status">' + escapeHtml(notice) + '</div>' : '') +
      '</div>';
  }

  function onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || !mount.contains(button)) return;
    const action = button.getAttribute("data-action");
    notice = "";

    switch (action) {
      case "toggle-collapse":
        mutate(function (copy) { copy.settings.collapsed = !copy.settings.collapsed; });
        break;
      case "material-plus":
        state = Core.addMaterial(state, 1); saveState(); render();
        break;
      case "material-minus":
        state = Core.addMaterial(state, -1); saveState(); render();
        break;
      case "rot-plus":
        state = Core.addRot(state, 1); saveState(); render();
        break;
      case "rot-minus":
        state = Core.addRot(state, -1); saveState(); render();
        break;
      case "convert":
        state = Core.convertMaterialToRot(state, 1); saveState(); render();
        break;
      case "primary": {
        const before = state;
        state = Core.performPrimaryAction(state);
        if (state === before) {
          notice = "Add the required materials or rotten fungus before completing this step.";
        }
        saveState(); render();
        break;
      }
      case "previous":
        state = Core.retreat(state); saveState(); render();
        break;
      case "reset-route":
        resetRouteKeepingEncounter();
        break;
      case "discard-recovery":
        state = Core.endEncounter(state, Date.now());
        notice = "Saved encounter discarded.";
        saveState(); render();
        break;
      default:
        break;
    }
  }

  function onChange(event) {
    const kind = event.target.getAttribute("data-change");
    if (!kind || state.progress.active) return;
    const value = event.target.value;
    if (kind === "party") state = Core.updateSettings(state, { partySize: Number(value) }, Date.now());
    if (kind === "role") state = Core.updateSettings(state, { roleId: value }, Date.now());
    if (kind === "rot") state = Core.updateSettings(state, { rotResponsibility: value }, Date.now());
    notice = "Route preset updated.";
    saveState();
    render();
  }

  function installEncounterHooks() {
    if (hooksInstalled) return true;
    if (typeof window.startEncounter !== "function" || typeof window.stopEncounter !== "function") {
      return false;
    }

    originalStartEncounter = window.startEncounter;
    window.startEncounter = function (offset) {
      const now = Date.now();
      const recovery = Core.assessRecovery(state, now);
      let effectiveOffset = Number(offset) || 0;

      if (state.progress.recoveryPending && recovery.recoverable) {
        effectiveOffset = state.progress.startOffsetMs - recovery.elapsedMs;
        state = Core.startEncounter(state, now, true);
        notice = "Interrupted encounter recovered.";
      } else {
        state = Core.startEncounter(state, now, false);
        state.progress.startOffsetMs = effectiveOffset;
        notice = "New encounter started; route progress reset.";
      }
      saveState();
      render();
      return originalStartEncounter.call(this, effectiveOffset);
    };

    originalStopEncounter = window.stopEncounter;
    window.stopEncounter = function () {
      const result = originalStopEncounter.apply(this, arguments);
      state = Core.endEncounter(state, Date.now());
      notice = "Encounter ended; route tracker reset.";
      saveState();
      render();
      return result;
    };

    hooksInstalled = true;
    return true;
  }

  function waitForEncounterHooks() {
    if (installEncounterHooks()) return;
    let attempts = 0;
    const timer = window.setInterval(function () {
      attempts += 1;
      if (installEncounterHooks() || attempts >= 100) {
        window.clearInterval(timer);
      }
      if (attempts === 100 && !hooksInstalled) {
        console.warn("SusAlert route tracker could not attach encounter reset hooks.");
      }
    }, 100);
  }

  function init() {
    mount = document.getElementById("routeTrackerMount");
    if (!mount) {
      mount = document.createElement("section");
      mount.id = "routeTrackerMount";
      const incoming = document.getElementById("incomingBox");
      if (incoming && incoming.parentNode && incoming.parentNode.parentNode) {
        incoming.parentNode.parentNode.insertBefore(mount, incoming.parentNode.nextSibling);
      } else {
        document.body.appendChild(mount);
      }
    }
    mount.addEventListener("click", onClick);
    mount.addEventListener("change", onChange);
    waitForEncounterHooks();
    render();

    window.addEventListener("beforeunload", saveState);
    window.setInterval(function () {
      if (state.progress.active) saveState();
    }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
