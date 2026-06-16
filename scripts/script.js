/*
 * SusAlert encounter module
 *
 * Standalone derivative of the MIT-licensed SusAlert project by Raphire.
 * Original project credit is retained in README.md, NOTICE.md, and LICENSE.
 * This file is stored and served locally by this repository. It does not
 * download or evaluate code from the original SusAlert deployment.
 */
(function () {
  "use strict";

  const root = window;
  const byId = (id) => document.getElementById(id);

  if (root.A1lib && typeof root.A1lib.identifyApp === "function") {
    root.A1lib.identifyApp("appconfig.json");
  }

  let isPaused = true;
  let isAttackable = false;
  let chatEndDetected = false;
  let recalButtonVisible = false;
  let crystalMaskActive = false;
  let startDate = Date.now();
  let attackStartDate = Date.now();
  let currentTooltip = "";
  let lastUpcomingMessage = "";
  let attackOffset = 0;
  let recalOffset = 0;
  let intervalCount = 0;
  let attackEndCount = 0;
  let loadingCount = 2;
  let oldTimeLeft = -1;
  let oldLineTime = new Date(0);
  let tooltipSetting = 1;
  let styleSetting = 0;
  let countdownSoundSetting = 0;
  let compactModeSetting = 1;
  let extendedModeSetting = 1;
  let crystalMaskSetting = 1;
  let crystalMaskBorderSetting = 1;
  let crystalMaskSoundSetting = 0;
  let startOffset = 0;
  let endCountRequired = 10;
  let midOffset = 14;
  let debugMode = false;
  let debugStart = false;
  let chatReader = null;
  let bossTimerReader = null;
  let buffReader = null;
  let buffReadInterval = null;
  let readInterval = null;
  let findChatInterval = null;

  const attacks = {
    15: ["Red bomb", "Move"],
    27: ["Fairy ring", "Move"],
    39: ["Slimes", "Evade"],
    51: ["Yellow bomb", "Move"],
    63: ["Stun", "Use Anticipation"],
    72: ["Sticky fungi", "Click your feet"],
    87: ["Green bomb", "Move"],
    99: ["Fairy ring", "Move"],
    111: ["Slimes", "Evade"],
    123: ["Blue bomb", "Move"],
    135: ["Stun", "Use Anticipation"],
    144: ["Middle energy fungus", "Go to the middle"]
  };

  const countdownColors = {
    0: { 5: "white", 4: "white", 3: "white", 2: "white", 1: "white", 0: "white" },
    1: { 5: "white", 4: "white", 3: "white", 2: "yellow", 1: "orange", 0: "red" },
    2: { 5: "white", 4: "white", 3: "red", 2: "orange", 1: "yellow", 0: "limegreen" }
  };

  const alertSounds = {
    1: ["./assets/shatter.mp3", 0.6],
    2: ["./assets/shatter2.mp3", 0.45],
    3: ["./assets/bell.mp3", 0.2],
    4: ["./assets/spell.mp3", 0.1],
    5: ["./assets/damage.mp3", 0.2],
    6: ["./assets/fireball.mp3", 0.2],
    7: ["./assets/alert.mp3", 0.2],
    69: ["./assets/warningend.mp3", 0.5]
  };

  const countdownSounds = {
    1: [["./assets/beep.mp3", 0.7], ["./assets/beeps.mp3", 0.7]],
    2: [["./assets/race1.mp3", 0.2], ["./assets/race2.mp3", 0.15]],
    3: [["./assets/softbeep.mp3", 0.7], ["./assets/softendbeep.mp3", 0.7]],
    4: [["./assets/xylo.mp3", 0.3], ["./assets/xyloend.mp3", 0.25]],
    69: [["./assets/warningend.mp3", 0.5], ["./assets/warningend.mp3", 0.5]]
  };

  const borderColors = {
    1: ["green-border", "red-border"],
    2: ["blue-border", "red-border"],
    3: ["blue-border", "yellow-border"],
    4: ["blue-border", "white-border"],
    5: ["white-border", "red-border"]
  };

  let alertSound = new Audio("./assets/shatter.mp3");
  let countdownSound = new Audio("./assets/softbeep.mp3");
  let countdownFinishSound = new Audio("./assets/softendbeep.mp3");

  function safePlay(audio) {
    if (!audio || typeof audio.play !== "function") return;
    try {
      const result = audio.play();
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (_) {}
  }

  function message(text, elementId, color) {
    const element = byId(elementId || "incomingBox");
    if (!element) return;
    if (element.textContent !== String(text)) element.textContent = String(text);
    element.style.color = color || "white";
  }

  function updateTooltip(text) {
    currentTooltip = text || "";
    if (!root.alt1) return;
    try {
      if (currentTooltip && typeof root.alt1.setTooltip === "function") {
        root.alt1.setTooltip(" " + currentTooltip);
      } else if (typeof root.alt1.clearTooltip === "function") {
        root.alt1.clearTooltip();
      }
    } catch (_) {}
  }

  function showSelectedChat(chat) {
    if (!root.alt1 || !root.A1lib || !chat || !chat.mainbox || !chat.mainbox.rect) return;
    try {
      root.alt1.overLayRect(
        root.A1lib.mixColor(255, 255, 255),
        chat.mainbox.rect.x,
        chat.mainbox.rect.y,
        chat.mainbox.rect.width,
        chat.mainbox.rect.height,
        2000,
        3
      );
    } catch (_) {}
  }

  function constructorFrom(globalName) {
    const value = root[globalName];
    if (!value) return null;
    return value.default || value;
  }

  function loadSettings() {
    const number = (key, fallback) => {
      const raw = localStorage.getItem(key);
      const parsed = Number(raw);
      return raw !== null && Number.isFinite(parsed) ? parsed : fallback;
    };
    tooltipSetting = number("susTT", 1);
    styleSetting = number("susStyle", 0);
    countdownSoundSetting = number("susCountdownSound", 0);
    compactModeSetting = number("susCompactMode", 1);
    extendedModeSetting = number("susExtendedMode", 1);
    crystalMaskSetting = number("susCMask", 1);
    crystalMaskBorderSetting = number("susCMaskBorder", 1);
    crystalMaskSoundSetting = number("susCMaskSound", 0);
    startOffset = number("susStartDelay", 0);
    endCountRequired = Math.max(6, number("susEndCount", 10));
    midOffset = number("susMidDelay", 14);
    debugMode = localStorage.getItem("susDebug") !== null;
    updateCountdownSoundSetting(false);
    updateAlertSound(false);
    updateUISize(false);
    if (debugMode && byId("debugButton")) byId("debugButton").classList.remove("d-none");
  }

  function initReaders() {
    const ChatboxClass = constructorFrom("Chatbox");
    const BossTimerClass = constructorFrom("BossTimer") || constructorFrom("Bosstimer");
    const BuffsClass = constructorFrom("Buffs");

    if (!root.alt1) {
      message("Open SusAlert in Alt1 Toolkit.");
      return false;
    }
    if (!root.A1lib || !ChatboxClass || !BossTimerClass) {
      message("Alt1 reader libraries did not load. Reinstall this repository and reopen SusAlert.");
      console.error("SusAlert missing reader libraries", {
        A1lib: !!root.A1lib,
        Chatbox: !!ChatboxClass,
        BossTimer: !!BossTimerClass,
        Buffs: !!BuffsClass
      });
      return false;
    }

    try {
      chatReader = new ChatboxClass();
      chatReader.readargs = {
        colors: [
          root.A1lib.mixColor(255, 255, 255),
          root.A1lib.mixColor(130, 70, 184),
          root.A1lib.mixColor(159, 255, 159),
          root.A1lib.mixColor(255, 82, 86),
          root.A1lib.mixColor(255, 0, 0),
          root.A1lib.mixColor(0, 174, 0),
          root.A1lib.mixColor(45, 184, 20),
          root.A1lib.mixColor(67, 188, 188),
          root.A1lib.mixColor(102, 152, 255),
          root.A1lib.mixColor(235, 47, 47),
          root.A1lib.mixColor(255, 255, 0),
          root.A1lib.mixColor(0, 255, 255),
          root.A1lib.mixColor(30, 255, 0),
          root.A1lib.mixColor(127, 169, 255),
          root.A1lib.mixColor(0, 255, 0),
          root.A1lib.mixColor(255, 112, 0),
          root.A1lib.mixColor(163, 53, 238)
        ],
        backwards: true
      };
      bossTimerReader = new BossTimerClass();
      buffReader = BuffsClass ? new BuffsClass() : null;
      return true;
    } catch (error) {
      message("SusAlert could not initialise its screen readers.");
      console.error(error);
      return false;
    }
  }

  function findChatbox() {
    if (!chatReader) return;
    if (chatReader.pos === null || typeof chatReader.pos === "undefined") {
      try {
        let dots = ".";
        for (let index = 0; index < loadingCount % 3; index += 1) dots += ".";
        loadingCount += 1;
        message("Looking for chat box" + dots);
        chatReader.find();
      } catch (error) {
        const text = String(error && error.message || error);
        if (text.includes("capturehold")) message("Cannot find the RuneScape client. Restart Alt1.");
        else if (text.includes("permission")) message("Alt1 permission is missing. Reinstall the app.");
        else message("Could not find the chat box. Check settings and interface scaling.");
        console.error(error);
      }
      return;
    }

    window.clearInterval(findChatInterval);
    const boxes = Array.isArray(chatReader.pos.boxes) ? chatReader.pos.boxes : [];
    if (boxes.length) {
      const saved = Number(localStorage.getItem("susChat") || 0);
      chatReader.pos.mainbox = boxes[Math.min(Math.max(saved, 0), boxes.length - 1)];
      showSelectedChat(chatReader.pos);
    }
    message("Ready. Awaiting boss start...");

    if (crystalMaskSetting !== 0 && buffReader) {
      buffReadInterval = window.setInterval(readBuffBar, 600);
    }
    readInterval = window.setInterval(function () {
      if (intervalCount % 2 === 0 && !isPaused) readChatbox();
      else readBossTimer();
      intervalCount += 1;
    }, 300);
  }

  function extractLineTime(text) {
    const match = String(text).match(/\b([0-9]{2}):([0-9]{2}):([0-9]{2})\b/);
    if (!match) return null;
    const date = new Date();
    date.setHours(Number(match[1]), Number(match[2]), Number(match[3]), 0);
    if (Number(match[1]) === 23 && new Date().getHours() === 0) date.setDate(date.getDate() - 1);
    return date;
  }

  function setStatue(name, state) {
    const map = {
      Ophalmi: "Ophalmi - calcified-timber",
      Sana: "Sana - spores-algae",
      Tagga: "Tagga - timber-spores",
      Vendi: "Vendi - algae-calcified"
    };
    const element = byId(name + "Statue");
    if (!element || !map[name]) return;
    element.src = "assets/statues/" + map[name] + (state ? " - " + state : "") + ".png";
  }

  function parseStatueLine(text) {
    if (extendedModeSetting !== 0) return;
    const names = ["Ophalmi", "Sana", "Tagga", "Vendi"];
    if (text.includes("Go - restore") || text.includes("statue can be restored") || text.includes("Now - rekindle")) {
      names.forEach((name) => { if (text.includes(name)) setStatue(name, "complete"); });
      return;
    }
    if (text.includes("will answer our call") || text.includes("The statue is restored - awaken")) {
      names.forEach((name) => { if (text.includes(name)) setStatue(name, "built"); });
      return;
    }
    if (text.includes("Awaken the")) {
      if (text.includes("indomitable fisher")) setStatue("Ophalmi", "built");
      if (text.includes("prodigious woodcrafter")) setStatue("Sana", "built");
      if (text.includes("flint-hearted miner")) setStatue("Tagga", "built");
      if (text.includes("dauntless hunter")) setStatue("Vendi", "built");
    }
  }

  function readChatbox() {
    if (!chatReader || typeof chatReader.read !== "function") return;
    let lines = [];
    try { lines = chatReader.read() || []; } catch (error) { console.warn(error); return; }
    lines.forEach(function (line) {
      const text = String(line && line.text || "");
      if (debugMode) console.log(line);
      const time = extractLineTime(text);
      if (time && time < oldLineTime) return;
      if (time) oldLineTime = time;

      if (!isAttackable && (
        text.includes("is vulnerable. Attack its core") ||
        text.includes("dark feast subsides. Strike now") ||
        text.includes("is the time. To the core")
      )) {
        startAttack();
      } else if (isAttackable && (
        text.includes("feeds again - stand ready") ||
        text.includes("out - it is awakening") ||
        text.includes("is going to wake any moment")
      )) {
        endAttack();
      } else if (
        text.includes("Croesus sleeps...and we enjoy a brief respite") ||
        text.includes("We wouldn't have managed that without") ||
        text.includes("The Cathedral is safe...for now") ||
        text.includes("You have done it. Enjoy this victory while it lasts, World Guardian")
      ) {
        chatEndDetected = true;
      } else {
        parseStatueLine(text);
      }
    });
  }

  function bossTimerVisible() {
    if (!bossTimerReader || typeof bossTimerReader.find !== "function") return false;
    try { return bossTimerReader.find() !== null; } catch (_) { return false; }
  }

  function readBossTimer() {
    const visible = bossTimerVisible();
    if (visible) {
      attackEndCount = 0;
      if (isPaused) startEncounter(startOffset);
      return;
    }
    if (!isPaused && !debugStart) {
      if ((chatEndDetected && attackEndCount >= 3) || attackEndCount >= endCountRequired) stopEncounter();
      attackEndCount += 1;
    }
  }

  function readBuffBar() {
    if (!buffReader || crystalMaskSetting === 0 || typeof buffReader.find !== "function") return;
    try {
      if (buffReader.pos === null || typeof buffReader.pos === "undefined") {
        buffReader.find();
        return;
      }
      const readout = typeof buffReader.read === "function" ? buffReader.read() : [];
      if (!Array.isArray(readout)) return;
      const target = byId("cMaskImage");
      if (!target || !target.complete) return;
      const canvas = document.createElement("canvas");
      canvas.width = 25;
      canvas.height = 25;
      const context = canvas.getContext("2d");
      context.drawImage(target, 0, 0, 25, 25);
      const imageData = context.getImageData(0, 0, 25, 25);
      const found = readout.some(function (buff) {
        if (!buff || typeof buff.countMatch !== "function") return false;
        const result = buff.countMatch(imageData, false);
        return result && result.passed >= 70;
      });
      setCrystalMaskState(found);
    } catch (error) {
      if (debugMode) console.warn("Crystal Mask read failed", error);
    }
  }

  function setCrystalMaskState(found) {
    if (found === crystalMaskActive) return;
    crystalMaskActive = found;
    const image = byId("cMaskImage");
    const body = byId("body");
    if (image) image.classList.toggle("d-none", !found);
    if (body && crystalMaskBorderSetting !== 0) {
      const pair = borderColors[crystalMaskBorderSetting];
      body.classList.remove(pair[found ? 1 : 0]);
      body.classList.add(pair[found ? 0 : 1]);
    }
    if (!found && crystalMaskSoundSetting !== 0) safePlay(alertSound);
  }

  function calculateMidOffset() {
    const elapsed = Math.max(0, Date.now() - startDate) / 1000 - attackOffset;
    const cycle = 147 + midOffset;
    const cycleTime = elapsed % cycle;
    recalOffset = cycleTime >= 148 ? cycleTime - cycle : cycleTime <= 25 ? cycleTime : recalOffset;
    recalButtonVisible = false;
    if (byId("recalButton")) byId("recalButton").classList.add("d-none");
  }

  function calculateTimeAndUpdateUI() {
    if (isPaused) return;
    const milliseconds = Math.max(0, Date.now() - startDate);
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor(milliseconds / 1000) % 60;
    message(String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0"), "timerBox");

    let adjusted = milliseconds / 1000 - attackOffset - recalOffset;
    if (adjusted >= 143 + midOffset) {
      const cycle = 147 + midOffset;
      const original = adjusted;
      adjusted %= cycle;
      if (adjusted < 0) adjusted = original - recalOffset;
    }
    if (isAttackable) return;

    const keys = Object.keys(attacks).map(Number);
    let incomingIndex = -1;
    let attackTime = 0;
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (adjusted > key - 4 && adjusted < key + 9) {
        if (index === keys.length - 1) {
          if (adjusted < key + 7) {
            incomingIndex = index;
            attackTime = key;
          } else if (!recalButtonVisible) {
            recalButtonVisible = true;
            if (byId("recalButton")) byId("recalButton").classList.remove("d-none");
            message("");
          }
        } else if (adjusted < key + 3) {
          incomingIndex = index;
          attackTime = key;
          if (recalButtonVisible && byId("recalButton")) byId("recalButton").classList.add("d-none");
          recalButtonVisible = false;
        }
        break;
      }
    }

    if (incomingIndex >= 0) {
      const timeLeft = Math.max(0, Math.round(attackTime - adjusted));
      if (timeLeft !== oldTimeLeft) {
        oldTimeLeft = timeLeft;
        updateAttacksUI(keys, incomingIndex, timeLeft);
      }
    } else if (milliseconds > 3000) {
      if (currentTooltip) updateTooltip("");
      message("");
    }
  }

  function updateAttacksUI(keys, incomingIndex, timeLeft) {
    const key = keys[incomingIndex];
    const attack = attacks[key];
    const colorTable = countdownColors[styleSetting] || countdownColors[0];
    const color = colorTable[Math.min(5, Math.max(0, timeLeft))] || "white";
    if (timeLeft > 0) {
      if (countdownSoundSetting !== 0 && countdownSoundSetting !== 69 && timeLeft < 4) safePlay(countdownSound);
      message("Incoming attack in " + timeLeft + ":\n" + attack[0], "incomingBox", color);
    } else {
      message("Incoming attack:\n" + attack[0], "incomingBox", color);
      if (countdownSoundSetting !== 0) safePlay(countdownFinishSound);
    }

    if (!currentTooltip) {
      if (tooltipSetting === 1) updateTooltip(attack[0]);
      else if (tooltipSetting === 2) updateTooltip(attack[1]);
      else if (tooltipSetting === 3) updateTooltip(attack[0] + ", " + attack[1]);
      const next = keys[incomingIndex + 1];
      message(next ? "Next attack: " + attacks[next][0] : "Next: middle phase", "upcomingBox");
    }
  }

  function resetStatues() {
    ["Ophalmi", "Sana", "Tagga", "Vendi"].forEach((name) => setStatue(name, ""));
  }

  function startEncounter(offset) {
    isPaused = false;
    startDate = Date.now() + (Number(offset) || 0);
    oldLineTime = new Date();
    oldTimeLeft = -1;
    message("Encounter started");
    message("Next attack: Red bomb", "upcomingBox");
  }

  function stopEncounter() {
    isPaused = true;
    isAttackable = false;
    chatEndDetected = false;
    recalButtonVisible = false;
    currentTooltip = "";
    lastUpcomingMessage = "";
    attackEndCount = 0;
    attackOffset = 0;
    recalOffset = 0;
    intervalCount = 0;
    oldTimeLeft = -1;
    updateTooltip("");
    resetStatues();
    if (byId("recalButton")) byId("recalButton").classList.add("d-none");
    message("Encounter ended\nAwaiting boss start...");
    message("", "upcomingBox");
    message("00:00", "timerBox");
  }

  function startAttack() {
    isAttackable = true;
    lastUpcomingMessage = byId("upcomingBox") ? byId("upcomingBox").textContent : "";
    if (byId("recalButton")) byId("recalButton").classList.add("d-none");
    message("", "upcomingBox");
    message("Croesus is vulnerable.\nAttack the core!");
    attackStartDate = Date.now();
  }

  function endAttack() {
    isAttackable = false;
    updateTooltip("");
    message(lastUpcomingMessage, "upcomingBox");
    message("");
    attackOffset += (Date.now() - attackStartDate) / 1000;
  }

  function nudgeTimer(milliseconds) {
    startDate = Number(startDate) + Number(milliseconds || 0);
    calculateTimeAndUpdateUI();
  }

  function showUpcomingbox() {
    if (byId("upcomingBox")) byId("upcomingBox").classList.remove("d-none");
    if (byId("recalButton")) byId("recalButton").classList.remove("compactMode");
  }

  function hideUpcomingbox() {
    if (byId("upcomingBox")) byId("upcomingBox").classList.add("d-none");
    if (byId("recalButton")) byId("recalButton").classList.add("compactMode");
  }

  function showStatueIndicator() {
    if (byId("statuesBox")) byId("statuesBox").classList.remove("d-none");
    resetStatues();
  }

  function hideStatueIndicator() {
    if (byId("statuesBox")) byId("statuesBox").classList.add("d-none");
  }

  function compactStatueIndicator() {
    ["hrStatueDivider", "vrStatueDivider", "VendiStatue", "OphalmiStatue", "SanaStatue", "TaggaStatue"].forEach(function (id) {
      if (byId(id)) byId(id).classList.add("compactMode");
    });
  }

  function uncompactStatueIndicator() {
    ["hrStatueDivider", "vrStatueDivider", "VendiStatue", "OphalmiStatue", "SanaStatue", "TaggaStatue"].forEach(function (id) {
      if (byId(id)) byId(id).classList.remove("compactMode");
    });
  }

  function hideCrystalMaskIndicator() {
    const body = byId("body");
    if (body) ["green-border", "red-border", "blue-border", "yellow-border", "white-border"].forEach((name) => body.classList.remove(name));
    if (byId("cMaskImage")) byId("cMaskImage").classList.add("d-none");
  }

  function updateChatSetting() {
    if (!chatReader || !chatReader.pos || !Array.isArray(chatReader.pos.boxes)) return;
    const selected = Number(localStorage.getItem("susChat") || 0);
    if (chatReader.pos.boxes[selected]) {
      chatReader.pos.mainbox = chatReader.pos.boxes[selected];
      showSelectedChat(chatReader.pos);
    }
  }

  function updateTooltipSetting() {
    tooltipSetting = Number(localStorage.getItem("susTT") || 1);
    updateTooltip("");
  }

  function updateStyleSetting() {
    styleSetting = Number(localStorage.getItem("susStyle") || 0);
  }

  function updateCountdownSoundSetting(playSound) {
    countdownSoundSetting = Number(localStorage.getItem("susCountdownSound") || 0);
    const config = countdownSounds[countdownSoundSetting];
    if (config) {
      countdownSound = new Audio(config[0][0]);
      countdownSound.volume = config[0][1];
      countdownFinishSound = new Audio(config[1][0]);
      countdownFinishSound.volume = config[1][1];
    }
    if (playSound && countdownSoundSetting !== 0) safePlay(countdownFinishSound);
  }

  function updateUISize(showModal) {
    compactModeSetting = Number(localStorage.getItem("susCompactMode") || 1);
    extendedModeSetting = Number(localStorage.getItem("susExtendedMode") || 1);
    if (compactModeSetting === 0 && extendedModeSetting === 0) {
      hideUpcomingbox(); showStatueIndicator(); compactStatueIndicator();
      if (root.A1lib) root.A1lib.identifyApp("appconfig_statues_compact.json");
    } else if (compactModeSetting === 0) {
      hideUpcomingbox(); hideStatueIndicator();
      if (root.A1lib) root.A1lib.identifyApp("appconfig_compact.json");
    } else if (extendedModeSetting === 0) {
      showUpcomingbox(); showStatueIndicator(); uncompactStatueIndicator();
      if (root.A1lib) root.A1lib.identifyApp("appconfig_statues.json");
    } else {
      showUpcomingbox(); hideStatueIndicator();
      if (root.A1lib) root.A1lib.identifyApp("appconfig.json");
    }
    if (showModal) {
      const note = byId("resizeNotice");
      if (note) {
        note.classList.remove("d-none");
        window.setTimeout(() => note.classList.add("d-none"), 4000);
      }
    }
  }

  function updateCrystalMaskSetting() {
    crystalMaskSetting = Number(localStorage.getItem("susCMask") || 1);
    if (crystalMaskSetting === 0) {
      if (buffReadInterval) window.clearInterval(buffReadInterval);
      buffReadInterval = null;
      hideCrystalMaskIndicator();
      crystalMaskActive = false;
    } else if (!buffReadInterval && buffReader) {
      buffReadInterval = window.setInterval(readBuffBar, 600);
    }
  }

  function updateCrystalMaskBorder() {
    crystalMaskBorderSetting = Number(localStorage.getItem("susCMaskBorder") || 1);
    hideCrystalMaskIndicator();
    crystalMaskActive = false;
  }

  function updateAlertSound(playSound) {
    crystalMaskSoundSetting = Number(localStorage.getItem("susCMaskSound") || 0);
    const config = alertSounds[crystalMaskSoundSetting];
    if (config) {
      alertSound = new Audio(config[0]);
      alertSound.volume = config[1];
    }
    if (playSound && crystalMaskSoundSetting !== 0) safePlay(alertSound);
  }

  function updateStartOffset() { startOffset = Number(localStorage.getItem("susStartDelay") || 0); }
  function updateEndCountRequired() { endCountRequired = Math.max(6, Number(localStorage.getItem("susEndCount") || 10)); }
  function updateMidOffset() { midOffset = Number(localStorage.getItem("susMidDelay") || 14); }
  function getChatReader() { return chatReader; }

  function bindButton(id, handler) {
    const element = byId(id);
    if (!element) return;
    element.addEventListener("click", handler);
    element.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handler();
      }
    });
  }

  function init() {
    loadSettings();
    bindButton("debugButton", function () {
      debugStart = !debugStart;
      if (debugStart) startEncounter(); else stopEncounter();
    });
    bindButton("recalButton", calculateMidOffset);
    bindButton("plusButton", function () { nudgeTimer(-1000); });
    bindButton("minusButton", function () { nudgeTimer(1000); });

    window.setInterval(calculateTimeAndUpdateUI, 500);
    if (initReaders()) findChatInterval = window.setInterval(findChatbox, 1000);
  }

  root.startEncounter = startEncounter;
  root.stopEncounter = stopEncounter;
  root.startAttack = startAttack;
  root.endAttack = endAttack;
  root.calculateMidOffset = calculateMidOffset;
  root.calculateTimeAndUpdateUI = calculateTimeAndUpdateUI;
  root.nudgeTimer = nudgeTimer;
  root.getChatReader = getChatReader;
  root.updateChatSetting = updateChatSetting;
  root.updateTooltipSetting = updateTooltipSetting;
  root.updateStyleSetting = updateStyleSetting;
  root.updateCountdownSoundSetting = updateCountdownSoundSetting;
  root.updateUISize = updateUISize;
  root.updateCrystalMaskSetting = updateCrystalMaskSetting;
  root.updateCrystalMaskBorder = updateCrystalMaskBorder;
  root.updateAlertSound = updateAlertSound;
  root.updateStartOffset = updateStartOffset;
  root.updateEndCountRequired = updateEndCountRequired;
  root.updateMidOffset = updateMidOffset;
  root.alt1onrightclick = calculateMidOffset;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
