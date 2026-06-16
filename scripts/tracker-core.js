(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SusAlertTrackerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = 1;
  const STORAGE_KEY = "susAlert.routeTracker.v1";
  const MAX_RECOVERY_AGE_MS = 30 * 60 * 1000;

  const PLOTS = Object.freeze({
    hunter: Object.freeze({ id: "hunter", label: "Hunter", material: "Fungal spores" }),
    woodcutting: Object.freeze({ id: "woodcutting", label: "Woodcutting", material: "Timber fungus" }),
    mining: Object.freeze({ id: "mining", label: "Mining", material: "Calcified fungus" }),
    fishing: Object.freeze({ id: "fishing", label: "Fishing", material: "Fungal algae" })
  });

  // Anticlockwise arena order used by the common 4-player route.
  const ACW_ORDER = Object.freeze(["hunter", "woodcutting", "mining", "fishing"]);

  const PARTY_SIZES = Object.freeze([2, 4, 8]);
  const ROT_RESPONSIBILITIES = Object.freeze([
    Object.freeze({ id: "short", label: "Short runner" }),
    Object.freeze({ id: "long", label: "Long runner" }),
    Object.freeze({ id: "none", label: "None" })
  ]);

  function clampInt(value, min, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return min;
    return Math.min(max, Math.max(min, parsed));
  }

  function destination(startPlot, steps, direction) {
    const index = ACW_ORDER.indexOf(startPlot);
    if (index < 0) throw new Error("Unknown plot: " + startPlot);
    const signedSteps = direction === "cw" ? -steps : steps;
    return ACW_ORDER[(index + signedSteps + ACW_ORDER.length * 8) % ACW_ORDER.length];
  }

  function makeRole(id, label, partySize, startPlot, runnerType) {
    return Object.freeze({ id, label, partySize, startPlot, runnerType: runnerType || null });
  }

  const ROLES = Object.freeze({
    2: Object.freeze([
      makeRole("duo-hw", "Hunter / Woodcutting", 2, "hunter", "duo"),
      makeRole("duo-mf", "Mining / Fishing", 2, "mining", "duo")
    ]),
    4: Object.freeze([
      makeRole("four-hunter", "Hunter", 4, "hunter", "both"),
      makeRole("four-woodcutting", "Woodcutting", 4, "woodcutting", "both"),
      makeRole("four-mining", "Mining", 4, "mining", "both"),
      makeRole("four-fishing", "Fishing", 4, "fishing", "both")
    ]),
    8: Object.freeze(ACW_ORDER.flatMap(function (plotId) {
      const plot = PLOTS[plotId];
      return [
        makeRole("eight-" + plotId + "-short", plot.label + " - short runner", 8, plotId, "short"),
        makeRole("eight-" + plotId + "-long", plot.label + " - long runner", 8, plotId, "long")
      ];
    }))
  });

  function getRoles(partySize) {
    return ROLES[partySize] || [];
  }

  function findRole(partySize, roleId) {
    const roles = getRoles(partySize);
    return roles.find(function (role) { return role.id === roleId; }) || roles[0] || null;
  }

  function step(id, type, plot, options) {
    return Object.assign({ id, type, plot }, options || {});
  }

  function buildDuoRoute(role) {
    const start = role.startPlot;
    const second = destination(start, 1, "acw");
    const final = destination(start, 1, "cw");
    const startMaterial = PLOTS[start].material;
    const secondMaterial = PLOTS[second].material;

    return {
      id: role.id,
      title: role.label + " duo route",
      partySize: 2,
      role,
      totals: { gatherMaterials: 30, deliverMaterials: 30, rot: 20 },
      notes: "Duo requires both assigned plots to be depleted and poisoned; the rotten fungus duty selector is not used for this route.",
      steps: [
        step("duo-gather-start", "gather", start, {
          amount: 15,
          requiresClear: true,
          title: "Gather and clear " + PLOTS[start].label,
          instruction: "Keep gathering " + startMaterial + " until you hold 15 and the patch is fully depleted. Convert only excess materials to rotten fungus."
        }),
        step("duo-move-second", "move", start, {
          destination: second,
          direction: "anticlockwise",
          distance: 1,
          title: "Move one plot anticlockwise",
          instruction: "Travel to " + PLOTS[second].label + "."
        }),
        step("duo-deposit-first", "deposit", second, {
          amount: 15,
          title: "Deposit first materials",
          instruction: "Deposit 15 " + startMaterial + " into the " + PLOTS[second].label + " statue."
        }),
        step("duo-gather-second", "gather", second, {
          amount: 15,
          requiresClear: true,
          title: "Gather and clear " + PLOTS[second].label,
          instruction: "Keep gathering " + secondMaterial + " until you hold 15 and this patch is fully depleted."
        }),
        step("duo-rot", "rot", second, {
          amount: 20,
          title: "Prepare rotten fungus for both patches",
          instruction: "Collect or convert materials until you hold 20 rotten fungus."
        }),
        step("duo-poison-second", "poison", second, {
          amount: 10,
          title: "Poison " + PLOTS[second].label,
          instruction: "Use 10 rotten fungus to poison the depleted " + PLOTS[second].label + " patch."
        }),
        step("duo-return-start", "move", second, {
          destination: start,
          direction: "clockwise",
          distance: 1,
          title: "Return to your starting plot",
          instruction: "Travel one plot clockwise to " + PLOTS[start].label + "."
        }),
        step("duo-poison-start", "poison", start, {
          amount: 10,
          title: "Poison " + PLOTS[start].label,
          instruction: "Use the remaining 10 rotten fungus to poison your starting patch."
        }),
        step("duo-move-final", "move", start, {
          destination: final,
          direction: "clockwise",
          distance: 1,
          title: "Move to the final statue",
          instruction: "Travel one more plot clockwise to " + PLOTS[final].label + "."
        }),
        step("duo-deposit-second", "deposit", final, {
          amount: 15,
          title: "Deposit second materials",
          instruction: "Deposit 15 " + secondMaterial + " into the " + PLOTS[final].label + " statue."
        }),
        step("duo-restore", "restore", final, {
          title: "Restore and coordinate prayer",
          instruction: "Restore the statue, fully repair, and coordinate the prayer with your duo partner before entering the core."
        })
      ]
    };
  }

  function buildFourRoute(role, rotResponsibility) {
    const start = role.startPlot;
    const longDestination = destination(start, 2, "acw");
    const finalDestination = destination(longDestination, 1, "acw");
    const ownMaterial = PLOTS[start].material;
    const withdrawnMaterial = PLOTS[longDestination].material;
    const steps = [
      step("four-gather-store", "gather", start, {
        amount: 16,
        title: "Gather the stored set",
        instruction: "Gather 16 " + ownMaterial + ". Keep gathering until the counter reaches 16."
      }),
      step("four-store", "store", start, {
        amount: 16,
        title: "Deposit 16 into storage",
        instruction: "Deposit the first 16 materials into the nearby storage table for the next runner."
      }),
      step("four-gather-carry", "gather", start, {
        amount: 16,
        requiresClear: true,
        title: "Gather the carried set and clear the patch",
        instruction: "Gather another 16 " + ownMaterial + " and keep gathering until the patch is fully depleted."
      })
    ];

    if (rotResponsibility === "long") {
      steps.push(
        step("four-rot-long", "rot", start, {
          amount: 10,
          title: "Prepare rotten fungus before the long run",
          instruction: "Collect or convert materials until you hold 10 rotten fungus."
        }),
        step("four-poison-long", "poison", start, {
          amount: 10,
          title: "Poison the starting patch",
          instruction: "Poison the depleted " + PLOTS[start].label + " patch before leaving."
        })
      );
    }

    steps.push(
      step("four-long-move", "move", start, {
        destination: longDestination,
        direction: "anticlockwise",
        distance: 2,
        title: "Take the long run",
        instruction: "Move two plots anticlockwise to " + PLOTS[longDestination].label + "."
      }),
      step("four-long-deposit", "deposit", longDestination, {
        amount: 16,
        title: "Deposit the carried materials",
        instruction: "Deposit 16 " + ownMaterial + " into the statue."
      }),
      step("four-withdraw", "withdraw", longDestination, {
        amount: 16,
        title: "Withdraw the next materials",
        instruction: "Withdraw all 16 " + withdrawnMaterial + " from the nearby storage table."
      }),
      step("four-short-move", "move", longDestination, {
        destination: finalDestination,
        direction: "anticlockwise",
        distance: 1,
        title: "Take the short run",
        instruction: "Move one plot anticlockwise to " + PLOTS[finalDestination].label + "."
      }),
      step("four-short-deposit", "deposit", finalDestination, {
        amount: 16,
        title: "Deposit the withdrawn materials",
        instruction: "Deposit the 16 withdrawn " + withdrawnMaterial + " into the statue."
      })
    );

    if (rotResponsibility === "short") {
      steps.push(
        step("four-rot-short", "rot", finalDestination, {
          amount: 10,
          title: "Prepare rotten fungus at the final plot",
          instruction: "Collect or convert materials until you hold 10 rotten fungus."
        }),
        step("four-poison-short", "poison", finalDestination, {
          amount: 10,
          title: "Poison the final patch",
          instruction: "Poison the depleted " + PLOTS[finalDestination].label + " patch."
        })
      );
    }

    steps.push(
      step("four-restore", "restore", finalDestination, {
        title: "Restore and wait to pray",
        instruction: "Restore this statue. Wait until the team is ready, then pray together and move to the core."
      })
    );

    return {
      id: role.id + "-" + rotResponsibility,
      title: role.label + " - 4-player 16-material route",
      partySize: 4,
      role,
      totals: {
        gatherMaterials: 32,
        deliverMaterials: 32,
        rot: rotResponsibility === "none" ? 0 : 10
      },
      notes: "Default order is long-two then short-one, all anticlockwise.",
      steps
    };
  }

  function buildEightRoute(role, rotResponsibility) {
    const start = role.startPlot;
    const distance = role.runnerType === "short" ? 1 : 2;
    const destinationPlot = destination(start, distance, "acw");
    const ownMaterial = PLOTS[start].material;
    const handlesRot = role.runnerType === rotResponsibility;
    const steps = [
      step("eight-gather", "gather", start, {
        amount: 16,
        requiresClear: true,
        title: "Gather 16 and help clear the patch",
        instruction: "Gather 16 " + ownMaterial + ". Keep gathering or help your partner until the shared patch is depleted."
      })
    ];

    if (handlesRot) {
      steps.push(
        step("eight-rot", "rot", start, {
          amount: 10,
          title: "Prepare rotten fungus",
          instruction: "Collect or convert materials until you hold 10 rotten fungus."
        }),
        step("eight-poison", "poison", start, {
          amount: 10,
          title: "Poison the starting patch",
          instruction: "Poison the depleted " + PLOTS[start].label + " patch before leaving."
        })
      );
    }

    steps.push(
      step("eight-move", "move", start, {
        destination: destinationPlot,
        direction: "anticlockwise",
        distance,
        title: role.runnerType === "short" ? "Take the short run" : "Take the long run",
        instruction: "Move " + distance + " plot" + (distance === 1 ? "" : "s") + " anticlockwise to " + PLOTS[destinationPlot].label + "."
      }),
      step("eight-deposit", "deposit", destinationPlot, {
        amount: 16,
        title: "Deposit materials",
        instruction: "Deposit 16 " + ownMaterial + " into the statue."
      }),
      step("eight-restore", "restore", destinationPlot, {
        title: "Restore and wait to pray",
        instruction: "Restore the statue when both material types are present. Wait for the team call before praying."
      })
    );

    return {
      id: role.id + "-" + rotResponsibility,
      title: role.label,
      partySize: 8,
      role,
      totals: { gatherMaterials: 16, deliverMaterials: 16, rot: handlesRot ? 10 : 0 },
      notes: handlesRot
        ? "This runner is responsible for poisoning the starting patch."
        : (rotResponsibility === "none" ? "No runner is assigned rotten fungus in this preset." : "Your paired " + rotResponsibility + " runner handles rotten fungus."),
      steps
    };
  }

  function buildRoute(settings) {
    const partySize = PARTY_SIZES.includes(Number(settings.partySize)) ? Number(settings.partySize) : 4;
    const role = findRole(partySize, settings.roleId);
    const rotResponsibility = ["short", "long", "none"].includes(settings.rotResponsibility)
      ? settings.rotResponsibility
      : "short";
    if (!role) throw new Error("No role available for party size " + partySize);
    if (partySize === 2) return buildDuoRoute(role);
    if (partySize === 4) return buildFourRoute(role, rotResponsibility);
    return buildEightRoute(role, rotResponsibility);
  }

  function defaultSettings() {
    return {
      partySize: 4,
      roleId: "four-hunter",
      rotResponsibility: "short",
      collapsed: false
    };
  }

  function freshProgress(route, now) {
    return {
      active: false,
      encounterStartedAt: null,
      startOffsetMs: 0,
      lastSavedAt: now || Date.now(),
      stepIndex: 0,
      currentPlot: route.role.startPlot,
      materialHeld: 0,
      rotHeld: 0,
      gatheredMaterials: 0,
      storedMaterials: 0,
      statueDeposited: 0,
      withdrawnMaterials: 0,
      rotCollected: 0,
      rotSpent: 0,
      clearedPlots: {},
      restored: false,
      completed: false,
      recoveryPending: false,
      history: []
    };
  }

  function createState(seed, now) {
    const baseSettings = defaultSettings();
    const settings = Object.assign(baseSettings, seed && seed.settings ? seed.settings : {});
    if (!PARTY_SIZES.includes(Number(settings.partySize))) settings.partySize = 4;
    settings.partySize = Number(settings.partySize);
    const role = findRole(settings.partySize, settings.roleId);
    settings.roleId = role ? role.id : getRoles(settings.partySize)[0].id;
    if (!["short", "long", "none"].includes(settings.rotResponsibility)) settings.rotResponsibility = "short";
    settings.collapsed = Boolean(settings.collapsed);

    const route = buildRoute(settings);
    const progress = Object.assign(freshProgress(route, now), seed && seed.progress ? seed.progress : {});
    progress.stepIndex = clampInt(progress.stepIndex, 0, route.steps.length);
    progress.currentPlot = PLOTS[progress.currentPlot] ? progress.currentPlot : route.role.startPlot;
    [
      "materialHeld", "rotHeld", "gatheredMaterials", "storedMaterials", "statueDeposited",
      "withdrawnMaterials", "rotCollected", "rotSpent"
    ].forEach(function (key) { progress[key] = clampInt(progress[key], 0, 999); });
    progress.clearedPlots = progress.clearedPlots && typeof progress.clearedPlots === "object"
      ? progress.clearedPlots
      : {};
    progress.active = Boolean(progress.active);
    progress.restored = Boolean(progress.restored);
    progress.completed = Boolean(progress.completed || progress.stepIndex >= route.steps.length);
    progress.lastSavedAt = Number(progress.lastSavedAt) || now || Date.now();
    progress.encounterStartedAt = Number(progress.encounterStartedAt) || null;
    progress.startOffsetMs = Number(progress.startOffsetMs) || 0;
    progress.recoveryPending = Boolean(progress.recoveryPending);
    progress.history = Array.isArray(progress.history)
      ? progress.history.slice(-50).filter(function (entry) { return entry && typeof entry === "object"; })
      : [];

    return { version: VERSION, settings, progress };
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function currentRoute(state) {
    return buildRoute(state.settings);
  }

  function currentStep(state) {
    const route = currentRoute(state);
    return route.steps[state.progress.stepIndex] || null;
  }

  function getTotals(state) {
    const route = currentRoute(state);
    const plannedWithdrawals = route.steps
      .filter(function (entry) { return entry.type === "withdraw"; })
      .reduce(function (sum, entry) { return sum + entry.amount; }, 0);
    const futureWithdrawals = Math.max(0, plannedWithdrawals - state.progress.withdrawnMaterials);
    const deliverMaterialsRemaining = Math.max(0, route.totals.deliverMaterials - state.progress.statueDeposited);
    const deliverySupplyGap = Math.max(
      0,
      deliverMaterialsRemaining - state.progress.materialHeld - futureWithdrawals
    );
    return {
      gatherMaterialsRemaining: Math.max(
        0,
        route.totals.gatherMaterials - state.progress.gatheredMaterials,
        deliverySupplyGap
      ),
      deliverMaterialsRemaining,
      rotRemaining: Math.max(0, route.totals.rot - state.progress.rotCollected),
      routeTotals: route.totals
    };
  }

  function addMaterial(state, delta) {
    const next = cloneState(state);
    const amount = Number(delta) || 0;
    if (amount > 0) {
      next.progress.materialHeld += amount;
      next.progress.gatheredMaterials += amount;
    } else if (amount < 0) {
      const removable = Math.min(next.progress.materialHeld, Math.abs(amount));
      next.progress.materialHeld -= removable;
      next.progress.gatheredMaterials = Math.max(0, next.progress.gatheredMaterials - removable);
    }
    return createState(next);
  }

  function addRot(state, delta) {
    const next = cloneState(state);
    const amount = Number(delta) || 0;
    if (amount > 0) {
      next.progress.rotHeld += amount;
      next.progress.rotCollected += amount;
    } else if (amount < 0) {
      const removable = Math.min(next.progress.rotHeld, Math.abs(amount));
      next.progress.rotHeld -= removable;
      next.progress.rotCollected = Math.max(next.progress.rotSpent, next.progress.rotCollected - removable);
    }
    return createState(next);
  }

  function convertMaterialToRot(state, amount) {
    const next = cloneState(state);
    const converted = Math.min(next.progress.materialHeld, clampInt(amount || 1, 1, 999));
    next.progress.materialHeld -= converted;
    next.progress.rotHeld += converted;
    next.progress.rotCollected += converted;
    return createState(next);
  }

  function progressSnapshot(progress) {
    const snapshot = cloneState(progress);
    delete snapshot.history;
    return snapshot;
  }

  function rememberProgress(state) {
    const next = cloneState(state);
    const history = Array.isArray(next.progress.history) ? next.progress.history : [];
    history.push(progressSnapshot(next.progress));
    next.progress.history = history.slice(-50);
    return next;
  }

  function advance(state) {
    const next = cloneState(state);
    const route = currentRoute(next);
    next.progress.stepIndex = Math.min(route.steps.length, next.progress.stepIndex + 1);
    next.progress.completed = next.progress.stepIndex >= route.steps.length;
    return createState(next);
  }

  function retreat(state) {
    const next = cloneState(state);
    const history = Array.isArray(next.progress.history) ? next.progress.history.slice() : [];
    const previous = history.pop();
    if (!previous) return state;
    next.progress = Object.assign({}, previous, { history: history });
    return createState(next);
  }

  function performPrimaryAction(state) {
    const stepData = currentStep(state);
    if (!stepData) return state;
    const current = state.progress;
    if (["store", "deposit"].includes(stepData.type) && current.materialHeld < stepData.amount) return state;
    if (stepData.type === "poison" && current.rotHeld < stepData.amount) return state;

    let next = rememberProgress(state);
    const p = next.progress;

    switch (stepData.type) {
      case "gather": {
        if (p.materialHeld < stepData.amount) {
          const delta = stepData.amount - p.materialHeld;
          p.materialHeld += delta;
          p.gatheredMaterials += delta;
          return createState(next);
        }
        if (stepData.requiresClear && !p.clearedPlots[stepData.plot]) {
          p.clearedPlots[stepData.plot] = true;
          return createState(next);
        }
        return advance(next);
      }
      case "rot": {
        if (p.rotHeld < stepData.amount) {
          const delta = stepData.amount - p.rotHeld;
          p.rotHeld += delta;
          p.rotCollected += delta;
          return createState(next);
        }
        return advance(next);
      }
      case "store": {
        p.materialHeld -= stepData.amount;
        p.storedMaterials += stepData.amount;
        return advance(next);
      }
      case "withdraw": {
        p.materialHeld += stepData.amount;
        p.withdrawnMaterials += stepData.amount;
        return advance(next);
      }
      case "deposit": {
        p.materialHeld -= stepData.amount;
        p.statueDeposited += stepData.amount;
        return advance(next);
      }
      case "poison": {
        p.rotHeld -= stepData.amount;
        p.rotSpent += stepData.amount;
        return advance(next);
      }
      case "move": {
        p.currentPlot = stepData.destination;
        return advance(next);
      }
      case "restore": {
        p.restored = true;
        return advance(next);
      }
      default:
        return advance(next);
    }
  }

  function primaryActionLabel(state) {
    const stepData = currentStep(state);
    if (!stepData) return "Route complete";
    const p = state.progress;
    switch (stepData.type) {
      case "gather":
        if (p.materialHeld < stepData.amount) return "Set held to " + stepData.amount;
        if (stepData.requiresClear && !p.clearedPlots[stepData.plot]) return "Mark patch clear";
        return "Continue";
      case "rot":
        return p.rotHeld < stepData.amount ? "Set rotten fungus to " + stepData.amount : "Continue";
      case "store": return "Store " + stepData.amount;
      case "withdraw": return "Withdraw " + stepData.amount;
      case "deposit": return "Deposit " + stepData.amount;
      case "poison": return "Poison plot";
      case "move": return "Arrived at " + PLOTS[stepData.destination].label;
      case "restore": return "Mark restored";
      default: return "Continue";
    }
  }

  function canPerformPrimaryAction(state) {
    const stepData = currentStep(state);
    if (!stepData) return false;
    const p = state.progress;
    if (["store", "deposit"].includes(stepData.type)) return p.materialHeld >= stepData.amount;
    if (stepData.type === "poison") return p.rotHeld >= stepData.amount;
    return true;
  }

  function nextDestination(state) {
    const route = currentRoute(state);
    for (let i = state.progress.stepIndex; i < route.steps.length; i += 1) {
      if (route.steps[i].type === "move") return route.steps[i].destination;
    }
    return null;
  }

  function resetProgress(state, now) {
    const next = cloneState(state);
    next.progress = freshProgress(currentRoute(next), now || Date.now());
    return createState(next, now);
  }

  function updateSettings(state, patch, now) {
    const next = cloneState(state);
    const oldPartySize = next.settings.partySize;
    Object.assign(next.settings, patch || {});
    if (!PARTY_SIZES.includes(Number(next.settings.partySize))) next.settings.partySize = oldPartySize;
    next.settings.partySize = Number(next.settings.partySize);
    if (next.settings.partySize !== oldPartySize || !findRole(next.settings.partySize, next.settings.roleId)) {
      next.settings.roleId = getRoles(next.settings.partySize)[0].id;
    }
    const clean = createState(next, now);
    clean.progress = freshProgress(currentRoute(clean), now || Date.now());
    return createState(clean, now);
  }

  function startEncounter(state, now, recover) {
    const timestamp = now || Date.now();
    let next = recover ? cloneState(state) : resetProgress(state, timestamp);
    next.progress.active = true;
    if (!recover || !next.progress.encounterStartedAt) next.progress.encounterStartedAt = timestamp;
    next.progress.lastSavedAt = timestamp;
    next.progress.recoveryPending = false;
    return createState(next, timestamp);
  }

  function endEncounter(state, now) {
    const next = resetProgress(state, now || Date.now());
    next.progress.active = false;
    next.progress.encounterStartedAt = null;
    next.progress.recoveryPending = false;
    return createState(next, now);
  }

  function assessRecovery(state, now) {
    const timestamp = now || Date.now();
    const started = Number(state.progress.encounterStartedAt);
    const lastSaved = Number(state.progress.lastSavedAt) || started;
    if (!state.progress.active || !started) {
      return { recoverable: false, ageMs: 0, elapsedMs: 0, stale: false };
    }
    const ageMs = Math.max(0, timestamp - lastSaved);
    const elapsedMs = Math.max(0, timestamp - started);
    return {
      recoverable: ageMs <= MAX_RECOVERY_AGE_MS,
      ageMs,
      elapsedMs,
      stale: ageMs > MAX_RECOVERY_AGE_MS
    };
  }

  function serialize(state) {
    const next = cloneState(state);
    next.progress.lastSavedAt = Date.now();
    return JSON.stringify(next);
  }

  function deserialize(text, now) {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") return createState(null, now);
      const state = createState(parsed, now);
      const recovery = assessRecovery(state, now);
      if (recovery.stale) return endEncounter(state, now);
      if (recovery.recoverable) state.progress.recoveryPending = true;
      return state;
    } catch (_) {
      return createState(null, now);
    }
  }

  return Object.freeze({
    VERSION,
    STORAGE_KEY,
    MAX_RECOVERY_AGE_MS,
    PLOTS,
    ACW_ORDER,
    PARTY_SIZES,
    ROT_RESPONSIBILITIES,
    getRoles,
    findRole,
    destination,
    buildRoute,
    createState,
    currentRoute,
    currentStep,
    getTotals,
    addMaterial,
    addRot,
    convertMaterialToRot,
    performPrimaryAction,
    primaryActionLabel,
    canPerformPrimaryAction,
    nextDestination,
    advance,
    retreat,
    resetProgress,
    updateSettings,
    startEncounter,
    endEncounter,
    assessRecovery,
    serialize,
    deserialize
  });
});
