// LoveHub Snake — UI (part 1): core class, menu shell, campaign flow, HUD, cinematics.
import {
  WORLDS, LEVELS_PER_WORLD, genLevel, eventInfo, POWERUPS, SKINS,
  ACHIEVEMENTS, totalStars, dailyChallenge, newDailyQuests,
} from "../core/content.js";
import {
  profile, grant, recordLevel, recordEndless, recordDaily, checkAchievements,
  dailyLogin, todayKey, xpForLevel, addQuestProgress, spend, unlockSkin,
  equipSkin, wheelSpin, chestOpen, claimQuest, prestige, saveProfile,
} from "../core/state.js";

const OB_FA = {
  spikes: "سنبله", lava: "گدازه", ice: "یخ", wind: "باد", mines: "مین",
  mwall: "دیوار متحرک", laser: "لیزر", teleport: "تلپورت", poison: "زهر",
  darkness: "تاریکی", magnet: "مغناطیس", rainbow: "رنگین", rocks: "سنگ", everything: "همهچیز",
};
function fmt(n) { return (n || 0).toLocaleString("en-US"); }
import { AudioSys } from "../core/audio.js";

export class UI {
  constructor({ game, renderer, root, hudRoot, toastRoot, cinRoot, dpadRoot }) {
    this.game = game;
    this.renderer = renderer;
    this.root = root;
    this.hudRoot = hudRoot;
    this.toastRoot = toastRoot;
    this.cinRoot = cinRoot;
    this.dpadRoot = dpadRoot;
    this.screen = "main";
    this.currentWorld = 0;
    this.daily = null;
    this.attempt = 0;
    this.replayMode = false;
    this.hudTimer = 0;
    this.bossBar = null;
    game.onEvent = (t, d) => this.handleEvent(t, d);
  }

  el(id) { return document.getElementById(id); }
  p() { return profile(); }

  // ---------- toasts ----------
  toast(text, icon = "✨") {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${text}</span>`;
    this.toastRoot.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 2600);
  }

  // ---------- screens ----------
  show(name) {
    this.screen = name;
    if (name === "game") {
      this.root.classList.add("hidden");
      this.hudRoot.classList.remove("hidden");
      this.bindDpad();
      return;
    }
    this.hudRoot.classList.add("hidden");
    this.root.classList.remove("hidden");
    const html = this.screenHtml(name);
    this.root.innerHTML = html;
    this.afterRender(name);
  }

  shell(inner, opts = {}) {
    const p = this.p();
    const ev = eventInfo();
    const evBanner = ev ? `<div class="event-banner" data-act="daily">${ev.icon} ${ev.fa}</div>` : "";
    const backBtn = opts.back ? `<button class="mini-btn" data-act="menu">← منو</button>` : "";
    return `
      <div class="screen-wrap">
        <div class="shell-top">
          ${backBtn}
          <div class="shell-title">${opts.title || "LoveHub Snake"}</div>
          <div class="currencies">
            <span class="cur">🪙 <b id="cur-coins">${fmt(p.coins)}</b></span>
            <span class="cur">💎 <b id="cur-gems">${fmt(p.gems)}</b></span>
            <span class="cur">🗝️ <b id="cur-keys">${fmt(p.keys)}</b></span>
            <span class="cur">⭐ <b id="cur-lvl">${p.level}</b></span>
          </div>
        </div>
        ${evBanner}
        <div class="shell-body">${inner}</div>
      </div>`;
  }

  screenHtml(name) {
    switch (name) {
      case "main": return this.shell(this.mainBody());
      case "worlds": return this.shell(this.worldsBody(), { title: "🌍 دنیاها", back: true });
      case "levels": return this.shell(this.levelsBody(), { title: `🗺 ${WORLDS[this.currentWorld].fa}`, back: true });
      case "shop": return this.shell(this.shopBody(), { title: "🛍 فروشگاه", back: true });
      case "collection": return this.shell(this.collectionBody(), { title: "🎨 مجموعه", back: true });
      case "achievements": return this.shell(this.achievementsBody(), { title: "🏅 دستاوردها", back: true });
      case "leaderboard": return this.shell(this.leaderboardBody(), { title: "🏆 جدول امتیازها", back: true });
      case "settings": return this.shell(this.settingsBody(), { title: "⚙️ تنظیمات", back: true });
      case "daily": return this.shell(this.dailyBody(), { title: "🌞 چالش روزانه", back: true });
      case "replay": return this.shell(this.replayBody(), { title: "🎬 بازپخش", back: true });
      default: return this.shell(this.mainBody());
    }
  }

  mainBody() {
    const p = this.p();
    const ev = eventInfo();
    const xpNeed = xpForLevel(p.level);
    const streak = p.login.streak;
    return `
      <div class="main-menu">
        <div class="logo-title">
          <div class="logo-badge">🐍</div>
          <h1>LoveHub <span>Snake</span></h1>
          <p class="tagline">نسخهی نهایی پرمیوم</p>
        </div>
        <div class="xp-bar-wrap"><div class="xp-bar" style="width:${Math.min(100, (p.xp / xpNeed) * 100)}%"></div><span class="xp-label">سطح ${p.level} — ${p.xp}/${xpNeed} XP</span></div>
        ${ev ? `<div class="main-event">${ev.icon} رویداد فعال: ${ev.fa}</div>` : ""}
        <div class="menu-grid">
          <button class="menu-btn primary" data-act="campaign">🎯 کمپین</button>
          <button class="menu-btn" data-act="endless">♾ حالت بیپایان</button>
          <button class="menu-btn accent" data-act="daily">🌞 چالش روزانه</button>
          <button class="menu-btn" data-act="worlds">🗺 نقشه دنیاها</button>
          <button class="menu-btn" data-act="shop">🛍 فروشگاه</button>
          <button class="menu-btn" data-act="collection">🎨 مجموعه</button>
          <button class="menu-btn" data-act="achievements">🏅 دستاوردها</button>
          <button class="menu-btn" data-act="leaderboard">🏆 امتیازها</button>
          <button class="menu-btn" data-act="replay">🎬 بازپخشها</button>
          <button class="menu-btn" data-act="settings">⚙️ تنظیمات</button>
        </div>
        <div class="streak-line">${streak > 0 ? `🔥 ${streak} روز متوالی` : "امروز وارد شو تا پاداش بگیری!"} — ${p.stats.levelsWon} برد</div>
      </div>`;
  }

  worldsBody() {
    const p = this.p();
    return `<div class="world-list">${WORLDS.map((w, i) => {
      const unlocked = this.worldUnlocked(i);
      const done = p.stars[i] || 0;
      return `
        <div class="world-card ${unlocked ? "" : "locked"}" data-act="${unlocked ? `levels:${i}` : ""}" style="--c1:${w.c1};--c2:${w.c2}">
          <div class="world-icon">${w.boss ? "👑" : "🌍"}</div>
          <div class="world-name">${w.fa}</div>
          <div class="world-progress">${done}/10 ${unlocked ? "" : "🔒"}</div>
          <div class="world-stars">${"★".repeat(Math.floor(done))}${"☆".repeat(10 - Math.floor(done))}</div>
          <div class="world-desc">${w.desc}</div>
        </div>`;
    }).join("")}</div>`;
  }

  worldUnlocked(i) {
    if (i === 0 || this.p().prestige >= 1) return true;
    const prevWorldLast = ((i - 1) * 10) + 9;
    return (this.p().starsPl[prevWorldLast] || 0) >= 1;
  }

  levelUnlocked(worldIdx, num) {
    if (num === 1) return true;
    return (this.p().starsPl[worldIdx * 10 + num - 2] || 0) >= 1;
  }

  levelsBody() {
    const w = this.currentWorld;
    const world = WORLDS[w];
    const p = this.p();
    return `
      <div class="level-grid">
        ${Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
          const num = i + 1;
          const unlocked = this.levelUnlocked(w, num);
          const stars = p.starsPl[w * 10 + i] || 0;
          const isBoss = num === 10;
          return `
          <button class="level-cell ${unlocked ? "" : "locked"} ${isBoss ? "boss" : ""}" data-act="${unlocked ? `play:${w}:${num}` : ""}">
            <div class="level-num">${isBoss ? "☠" : num}</div>
            <div class="level-stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
          </button>`;
        }).join("")}
      </div>
      <div class="back-row"><button class="menu-btn small" data-act="worlds">← بازگشت</button></div>`;
  }

  afterRender(name) {
    this.root.querySelectorAll("[data-act]").forEach((el2) => {
      el2.addEventListener("click", () => this.action(el2.getAttribute("data-act")));
    });
    if (name === "main") {
      const res = dailyLogin();
      if (!res.claimed) this.toast(`پاداش ورود روزانه: +${res.reward} سکه 🎁`, "📅");
    }
    if (name === "shop") this.afterShop();
    if (name === "collection") this.afterCollection();
    if (name === "settings") this.afterSettings();
    if (name === "daily") this.afterDaily();
    if (name === "leaderboard") this.afterLeaderboard();
  }

  action(act) {
    AudioSys.play("click");
    if (!act) return;
    if (act === "campaign") { this.attempt = 0; this.startCampaign(); }
    else if (act === "endless") this.startEndless();
    else if (act === "daily") this.startDaily();
    else if (act.startsWith("levels:")) { this.currentWorld = +act.split(":")[1]; this.show("levels"); }
    else if (act.startsWith("play:")) {
      const [, w, n] = act.split(":");
      this.attempt = 0;
      this.playLevel(+w, +n);
    }
    else if (act.startsWith("retry:")) this.retryLast();
    else if (act.startsWith("next:")) this.nextLevel();
    else if (act === "worlds" || act === "shop" || act === "collection" || act === "achievements" || act === "leaderboard" || act === "settings" || act === "replay") this.show(act);
    else if (act === "pause") this.game.togglePause();
    else if (act === "resume") this.game.togglePause();
    else if (act === "quit") { this.game.audio.stopMusic(); this.game.running = false; this.show("main"); }
    else if (act === "menu") this.show("main");
    else if (act.startsWith("buy-skin:")) this.buySkin(act.split(":")[1]);
    else if (act.startsWith("equip:")) this.equip(act.split(":")[1]);
    else if (act.startsWith("spin")) this.spinWheel();
    else if (act.startsWith("chest")) this.openChest();
    else if (act.startsWith("claim:")) this.claimQuest(+act.split(":")[1]);
    else if (act === "prestige") this.doPrestige();
    else if (act === "export-save") this.exportSave();
    else if (act === "import-save") this.importSave();
    else if (act === "reset-save") { if (confirm("همه پیشرفتها حذف شود؟")) { localStorage.removeItem("lovehub.snake.v1"); location.reload(); } }
    else if (act.startsWith("set:")) this.applySetting(act);
    else if (act.startsWith("toggle:")) this.applyToggle(act.split(":")[1]);
    else if (act.startsWith("replay-run:")) this.playReplay(+act.split(":")[2]);
  }

  // ---------- game flow ----------
  playLevel(worldIdx, levelNum) {
    const seed = worldIdx * 1000 + levelNum * 13 + this.attempt * 17;
    const level = genLevel(worldIdx, levelNum, seed, "campaign");
    this.lastLevel = { worldIdx, levelNum, seed };
    this.start(level, "campaign");
    if (levelNum === 1) this.cinematic("world", worldIdx);
    if (levelNum === 10) this.cinematic("boss", level);
  }

  retryLast() {
    if (!this.lastLevel) { this.show("worlds"); return; }
    this.attempt++;
    const { worldIdx, levelNum, seed } = this.lastLevel;
    this.playLevelSeed(worldIdx, levelNum, seed + 1);
  }

  nextLevel() {
    if (!this.lastLevel) { this.show("worlds"); return; }
    const { worldIdx, levelNum } = this.lastLevel;
    if (levelNum >= 10) { this.show("worlds"); return; }
    this.attempt = 0;
    this.playLevel(worldIdx, levelNum + 1);
  }

  playLevelSeed(worldIdx, levelNum, seed) {
    const level = genLevel(worldIdx, levelNum, seed, "campaign");
    this.lastLevel = { worldIdx, levelNum, seed };
    this.start(level, "campaign");
  }

  startCampaign() {
    // resume at first incomplete level
    const p = this.p();
    for (let w = 0; w < 10; w++) {
      for (let n = 1; n <= 10; n++) {
        if (!this.levelUnlocked(w, n)) { this.playLevel(w, n); return; }
      }
    }
    this.playLevel(9, 10); // all done → replay final
  }

  startEndless() {
    this.endlessT = 0;
    const seed = Date.now() % 999999;
    const level = genLevel(Math.floor(Math.random() * 10), 8, seed, "endless");
    level.speed = Math.min(level.speed * 1.15, 15);
    level.objectives = [];
    level.timeLimit = 0;
    this.start(level, "endless");
  }

  startDaily() {
    if (!this.daily || this.daily.dateKey !== todayKey()) {
      this.daily = dailyChallenge(todayKey());
    }
    this.attempt = 0;
    this.start(this.daily.level, "daily");
  }

  start(level, mode) {
    this.replayMode = false;
    this.game.skinId = this.p().skin;
    this.game.startLevel(level, mode);
  }

  playReplay(i) {
    const run = this.p().runs[i];
    if (!run) return;
    this.replayMode = true;
    this.toast("🎬 بازپخش...", "🎥");
    const level = genLevel(run.worldIdx, run.levelNum, run.seed, "campaign");
    this.game.skinId = this.p().skin;
    this.game.startLevel(level, "replay", { replay: run });
  }

  // ---------- HUD ----------
  bindDpad() {
    const left = this.p().settings.leftHanded;
    const up = `<button class="dpad-btn up" data-d="0,-1">▲</button>`;
    const down = `<button class="dpad-btn down" data-d="0,1">▼</button>`;
    const leftBtn = `<button class="dpad-btn left" data-d="-1,0">◀</button>`;
    const rightBtn = `<button class="dpad-btn right" data-d="1,0">▶</button>`;
    const pad = `
      <div class="dpad ${left ? "left-hand" : ""}">
        <div class="dpad-row">${up}</div>
        <div class="dpad-row">${leftBtn}${down}${rightBtn}</div>
      </div>`;
    this.dpadRoot.innerHTML = pad;
    this.dpadRoot.querySelectorAll("[data-d]").forEach((b) => {
      b.addEventListener("click", () => {
        const [dx, dy] = b.getAttribute("data-d").split(",").map(Number);
        this.game.inputDir(dx, dy);
      });
      b.addEventListener("touchstart", (e) => { e.preventDefault(); const [dx, dy] = b.getAttribute("data-d").split(",").map(Number); this.game.inputDir(dx, dy); }, { passive: false });
    });
  }

  hudStart() {
    const g = this.game;
    const l = g.level;
    const boss = !!l.boss;
    this.el("hud-top").innerHTML = `
      <div class="hud-top">
        <button class="hud-pause" data-act="pause">⏸</button>
        <div class="hud-score">امتیاز: <b id="hud-score">0</b></div>
        <div class="hud-combo hidden" id="hud-combo">×<span id="hud-combo-n">0</span></div>
        <div class="hud-timer hidden" id="hud-timer"></div>
        <div class="hud-lives" id="hud-lives"></div>
        <div class="hud-obj" id="hud-obj"></div>
      </div>`;
    this.el("boss-area").innerHTML = boss ? `<div class="boss-bar-wrap"><div class="boss-name">☠ ${l.boss.fa}</div><div class="boss-bar"><div class="boss-bar-fill" id="boss-hp"></div></div><div class="boss-hint" id="boss-hint">🔋 انرژی بگیر (۳ تا) و به سر باس ضربه بزن!</div></div>` : "";
    this.el("pu-chips").innerHTML = "";
    this.el("hud-top").querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => this.action(b.getAttribute("data-act"))));
    this.bindDpad();
    this.renderObjectives();
    this.updateHUD(true);
  }

  renderObjectives() {
    const l = this.game.level;
    const el = this.el("hud-obj");
    if (!el) return;
    const icons = { eat: "🍎", length: "📏", survive: "⏱", time: "⏳", nohit: "💠", keys: "🔑", boss: "☠" };
    el.innerHTML = l.objectives.map((o) => {
      const done = this.game.objectiveDone(o);
      const label = o.type === "eat" ? `${o.target} سیب` : o.type === "length" ? `طول ${o.target}` : o.type === "survive" ? `${o.seconds}s زنده بمان` : o.type === "time" ? "به موقع تمام کن" : o.type === "nohit" ? "بدون آسیب" : o.type === "keys" ? `${this.game.keysCollected}/${o.target} کلید` : "باس را شکست بده";
      return `<span class="obj-chip ${done ? "done" : ""}">${icons[o.type] || "🎯"} ${label}</span>`;
    }).join("");
  }

  updateHUD(force = false) {
    const g = this.game;
    if (!g || !g.level || g.mode === "replay") return;
    const sc = this.el("hud-score");
    if (sc && sc.textContent !== String(g.score)) sc.textContent = g.score;
    const combo = this.el("hud-combo");
    if (combo) {
      if (g.combo >= 2) { combo.classList.remove("hidden"); this.el("hud-combo-n").textContent = g.combo; }
      else combo.classList.add("hidden");
    }
    const timer = this.el("hud-timer");
    if (timer) {
      if (g.level.timeLimit > 0) {
        timer.classList.remove("hidden");
        const s = Math.ceil(g.level.timeLimit);
        timer.textContent = `⏳ ${s}`;
        if (s <= 10) timer.classList.add("urgent");
      } else if (g.level.objectives.some((o) => o.type === "survive")) {
        timer.classList.remove("hidden");
        timer.textContent = `⏱ ${Math.floor(g.secElapsed)}s`;
      } else timer.classList.add("hidden");
    }
    const lives = this.el("hud-lives");
    if (lives) lives.innerHTML = "❤️".repeat(Math.max(0, g.lives)) || "";
    const chips = this.el("pu-chips");
    if (chips) {
      const keys = Object.keys(g.powerups);
      chips.innerHTML = keys.map((k) => {
        const d = POWERUPS[k];
        const t = g.powerups[k].t;
        return `<span class="pu-chip" style="--c:${d.color}">${d.icon} ${t > 0 ? Math.ceil(t) + "s" : ""}</span>`;
      }).join("");
    }
    if (g.boss) {
      const hp = this.el("boss-hp");
      if (hp) hp.style.width = `${Math.max(0, (g.boss.hp / g.boss.maxHp) * 100)}%`;
      const hint = this.el("boss-hint");
      if (hint) {
        hint.textContent = g.boss.strikeReady
          ? "⚡ ضربه آماده است — به سر باس ضربه بزن!"
          : g.boss.cores > 0
            ? `🔋 ${g.boss.cores}/۳ انرژی — بدن باس خطرناک است`
            : "🔋 از هستههای انرژی باس (نقاط بنفش) بخور";
        hint.style.color = g.boss.strikeReady ? "#fde047" : "";
      }
    }
    this.renderObjectives();
  }

  // ---------- game events ----------
  handleEvent(type, data) {
    switch (type) {
      case "levelStart":
        this.screen = "game";
        this.root.classList.add("hidden");
        this.hudRoot.classList.remove("hidden");
        if (data.mode !== "replay") this.hudStart();
        else {
          this.el("hud-top").innerHTML = `<div class="replay-badge">🎬 بازپخش</div>`;
          this.el("boss-area").innerHTML = "";
          this.el("pu-chips").innerHTML = "";
          this.bindDpad();
        }
        break;
      case "endlessRegen": {
        const sc = this.game.score;
        const elapsed = this.game.secElapsed;
        const tier = Math.floor(elapsed / 30);
        const level = genLevel(Math.floor(Math.random() * 10), 8, (Date.now() % 999999) + tier * 7919, "endless");
        level.speed = Math.min(4.2 + tier * 0.55, 14);
        level.objectives = [];
        level.timeLimit = 0;
        this.game.skinId = this.p().skin;
        this.game.startLevel(level, "endless");
        this.game.score = sc;
        this.game.secElapsed = elapsed;
        this.toast(`♾ مرحله ${tier + 2} بیپایان — سرعت بیشتر!`, "♾️");
        break;
      }
      case "complete": this.onWin(); break;
      case "gameOver": this.onLose(data); break;
      case "powerup": this.toast(`${POWERUPS[data.type].icon} ${POWERUPS[data.type].fa} فعال شد`, POWERUPS[data.type].icon); break;
      case "strikeReady": this.toast("⚡ ضربه آماده است! به سر باس بزن", "⚡"); break;
      case "coreSpawned": break;
      case "bossPhase": this.toast(`💢 باس وارد فاز ${data.phase + 1} شد!`, "💢"); this.game.shake(10); break;
      case "bossDefeated": this.toast("باس شکست خورد! 🎉", "🏆"); this.game.fx.confetti(this.game.boss.head.x, this.game.boss.head.y, null, 60); break;
      case "secretFound": this.toast("🗝 اتاق مخفی! +۱۵۰ امتیاز", "🗝️"); break;
      case "shieldBreak": this.toast("سپر شکست!", "🛡"); break;
      case "respawn": this.toast("با جان تازه ادامه بده!", "❤️"); break;
      case "portalReached": this.toast("پرتال فعال شد!", "🚪"); break;
      case "pause": if (data.paused) this.showPause(); else this.hudRoot.classList.remove("hidden"); break;
    }
  }

  showPause() {
    this.hudRoot.classList.add("hidden");
    this.cinRoot.innerHTML = `
      <div class="cin pause-cin">
        <div class="cin-title">⏸ توقف</div>
        <div class="pause-btns">
          <button class="menu-btn primary" data-act="resume">▶ ادامه</button>
          <button class="menu-btn" data-act="retry:1">🔄 دوباره</button>
          <button class="menu-btn" data-act="menu">🏠 منو</button>
          <button class="menu-btn" data-act="settings-quick">⚙️ تنظیمات</button>
        </div>
      </div>`;
    this.cinRoot.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      const a = b.getAttribute("data-act");
      if (a === "resume") { this.cinRoot.innerHTML = ""; this.game.togglePause(); }
      else if (a === "retry:1") { this.cinRoot.innerHTML = ""; this.retryLast(); }
      else if (a === "settings-quick") { this.cinRoot.innerHTML = ""; this.game.running = false; this.game.audio.stopMusic(); this.show("settings"); }
      else this.action(a);
    }));
  }

  // ---------- win / lose ----------
  grantStats() {
    const g = this.game;
    const p = this.p();
    p.stats.apples += g.apples;
    p.stats.goldenApples += g.goldenApples;
    p.stats.maxLength = Math.max(p.stats.maxLength, g.length);
    p.stats.bestCombo = Math.max(p.stats.bestCombo, g.bestCombo);
    p.stats.gems += g.gemsCollected;
    p.stats.keys += g.keysCollected;
    p.stats.powerups += g.powerupsTaken;
    p.stats.secrets += g.secretFound ? 1 : 0;
    p.stats.frenzies += g.frenzyCount;
    p.stats.plays++;
    saveProfile();
  }

  onWin() {
    const g = this.game;
    const l = g.level;
    const mode = g.mode;
    const stars = Math.min(3, 1 + (g.secretFound ? 1 : 0) + (g.hits === 0 ? 1 : 0));
    this.grantStats();
    const run = {
      worldIdx: l.worldIdx, levelNum: l.levelNum, seed: l.seed, mode,
      score: g.score, stars, nohit: g.hits === 0, log: g.inputLog,
      len: g.length, date: new Date().toISOString().slice(0, 10),
    };
    let rewards = { coins: 0, gems: 0, xp: 0 };
    if (mode === "replay") { this.cinematic("win", { stars, rewards, score: g.score, mode, levelNum: l.levelNum, worldIdx: l.worldIdx }); return; }
    if (mode === "campaign") rewards = recordLevel(l.worldIdx, l.levelNum, stars, run);
    else if (mode === "endless") {
      recordEndless(g.score);
      addQuestProgress("endlessScore", g.score);
      rewards = { coins: Math.min(Math.floor(g.score / 8), 150), gems: 0, xp: 0 };
    } else if (mode === "daily") {
      recordDaily(g.score, this.daily ? this.daily.rewards : { coins: 100, gems: 1 });
      addQuestProgress("levelsWon");
      rewards = this.daily ? this.daily.rewards : { coins: 100, gems: 1 };
    }
    addQuestProgress("levelsWon");
    addQuestProgress("plays");
    const newly = checkAchievements({ g, mode, p: this.p() });
    newly.forEach((a) => this.toast(`دستاورد: ${a.fa} (+${a.reward} 🪙)`, a.icon));
    this.cinematic("win", { stars, rewards, score: g.score, mode, levelNum: l.levelNum, worldIdx: l.worldIdx });
    if (mode === "campaign" && l.levelNum === 10) {
      const w = WORLDS[l.worldIdx];
      setTimeout(() => this.toast(`🎉 دنیای «${w.fa}» کامل شد!`, "👑"), 1200);
    }
  }

  onLose(data) {
    const g = this.game;
    this.grantStats();
    if (g.mode === "endless") {
      recordEndless(g.score);
      addQuestProgress("endlessScore", g.score);
    }
    addQuestProgress("plays");
    const newly = checkAchievements({ g, p: this.p() });
    newly.forEach((a) => this.toast(`دستاورد: ${a.fa} (+${a.reward} 🪙)`, a.icon));
    this.cinematic("lose", { score: g.score, best: this.p().best.endless, mode: g.mode });
  }

  // ---------- cinematics ----------
  cinematic(kind, data) {
    const cin = this.cinRoot;
    if (kind === "world") {
      const w = WORLDS[data];
      cin.innerHTML = `<div class="cin world-cin" style="--c1:${w.c1};--c2:${w.c2}">
        <div class="cin-kicker">دنیای جدید</div>
        <div class="cin-title">${w.fa}</div>
        <div class="cin-desc">${w.desc}</div>
        <div class="cin-chips">${(w.obstacles[0] === "everything" ? ["mines", "laser", "teleport", "darkness", "wind", "spikes", "lava"] : w.obstacles).map((o) => `<span class="cin-chip">⚠️ ${OB_FA[o] || o}</span>`).join("")}</div>
      </div>`;
      setTimeout(() => { cin.innerHTML = ""; }, 2400);
      return;
    }
    if (kind === "boss") {
      const w = WORLDS[data.worldIdx];
      const b = data.boss;
      cin.innerHTML = `<div class="cin boss-cin" style="--c1:${w.c1};--c2:${b.c}">
        <div class="cin-kicker">☠ نبرد باس</div>
        <div class="cin-title">${b.fa}</div>
        <div class="cin-sub">${b.sub}</div>
        <div class="boss-prebar"><div class="boss-prebar-fill"></div></div>
      </div>`;
      this.game.audio.play("bossRoar");
      setTimeout(() => { cin.innerHTML = ""; }, 2400);
      return;
    }
    if (kind === "win") {
      const next = data.mode === "campaign" && data.levelNum < 10;
      cin.innerHTML = `<div class="cin win-cin">
        <div class="win-stars">${[1, 2, 3].map((i) => `<span class="ws ${i <= data.stars ? "lit" : ""}" style="animation-delay:${i * 0.3}s">★</span>`).join("")}</div>
        <div class="cin-title">پیروزی!</div>
        <div class="win-score">امتیاز: <b>${fmt(data.score)}</b></div>
        <div class="win-rewards">🪙 +${data.rewards.coins || 0} ${data.rewards.gems ? `💎 +${data.rewards.gems}` : ""} ${data.rewards.xp ? `⭐ +${data.rewards.xp} XP` : ""}</div>
        <div class="pause-btns">
          <button class="menu-btn primary" data-act="${next ? `next:` : data.mode === "endless" ? "endless" : "menu"}">${next ? "➡ مرحله بعد" : "🏠 منو"}</button>
          <button class="menu-btn" data-act="retry:1">🔄 دوباره</button>
        </div>
      </div>`;
      this.audioWin();
    }
    if (kind === "lose") {
      cin.innerHTML = `<div class="cin lose-cin">
        <div class="lose-face">💀</div>
        <div class="cin-title">باخت!</div>
        <div class="win-score">امتیاز: <b>${fmt(data.score)}</b></div>
        <div class="win-rewards">بهترین بیپایان: ${fmt(data.best)}</div>
        <div class="pause-btns">
          <button class="menu-btn primary" data-act="${data.mode === "endless" ? "endless" : "retry:1"}">🔄 تلاش دوباره</button>
          <button class="menu-btn" data-act="menu">🏠 منو</button>
        </div>
      </div>`;
    }
    if (kind === "win" || kind === "lose") {
      cin.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
        const a = b.getAttribute("data-act");
        cin.innerHTML = "";
        this.action(a);
      }));
    }
  }

  audioWin() {
    AudioSys.play("win");
    AudioSys.play("coin");
  }

  // ---------- shop ----------
  shopBody() {
    const p = this.p();
    const skinRows = SKINS.map((s) => {
      const owned = p.owned.includes(s.id);
      const equip = p.skin === s.id;
      const locked = !owned && s.unlock && !this.canUnlock(s);
      const price = s.price ? `${s.currency === "gems" ? "💎" : "🪙"} ${fmt(s.price)}` : "رایگان";
      return `<div class="shop-skin ${owned ? "owned" : "locked"} ${equip ? "eq" : ""} ${s.legendary ? "legendary" : ""}" style="--sc1:${s.colors[0]};--sc2:${s.colors[1]}">
        <div class="skin-icon">${s.icon}</div>
        <div class="skin-name">${s.fa} ${s.legendary ? "🌟" : ""} ${s.seasonal ? "🎉" : ""}</div>
        ${equip ? `<div class="skin-state">✔ مجهز</div>`
          : owned ? `<button class="mini-btn" data-act="equip:${s.id}">مجهز کن</button>`
          : locked ? `<div class="skin-state">${s.unlock.startsWith("achievement") ? "🔓 با دستاورد" : s.unlock.startsWith("event") ? "🎉 رویداد فصلی" : "🌟 پرستیژ"}</div>`
          : `<button class="mini-btn buy" data-act="buy-skin:${s.id}">${price}</button>`}
      </div>`;
    }).join("");
    return `
      <div class="shop-section"><h3>🎨 پوستههای مار</h3><div class="skin-grid">${skinRows}</div></div>
      <div class="shop-section">
        <h3>🎡 چرخ بخت <span class="cost">(۵۰ 🪙)</span></h3>
        <button class="menu-btn accent" data-act="spin">🎡 بچرخان</button>
        <h3>📦 صندوق سکه <span class="cost">(هر ۴ ساعت)</span></h3>
        <button class="menu-btn" data-act="chest">📦 باز کن (+۱۲۰ 🪙)</button>
        <h3>🌟 پرستیژ <span class="cost">(پیشرفتهای فعلی)</span></h3>
        <button class="menu-btn danger" data-act="prestige">🌟 پرستیژ: سطح ۱ → سطح ${p.prestige + 1}</button>
      </div>`;
  }

  canUnlock(s) {
    if (!s.unlock) return true;
    if (s.unlock.startsWith("achievement:")) return this.p().achievements.includes(s.unlock.split(":")[1]);
    if (s.unlock.startsWith("event:")) return (eventInfo() || {}).id === s.unlock.split(":")[1];
    if (s.unlock.startsWith("prestige:")) return this.p().prestige >= +s.unlock.split(":")[1];
    return true;
  }

  afterShop() {}

  buySkin(id) {
    const s = SKINS.find((x) => x.id === id);
    if (!s) return;
    const p = this.p();
    if (p.owned.includes(id)) { this.equip(id); return; }
    if (s.price && !this.canUnlock(s)) { this.toast("ابتدا شرط را برآورده کن!", "🔒"); return; }
    if (spend(s.price || 0, s.currency === "gems" ? s.price : 0)) {
      unlockSkin(id);
      equipSkin(id);
      AudioSys.play("coin");
      this.toast(`پوسته «${s.fa}» خریداری شد!`, s.icon);
      this.show("shop");
    } else this.toast("سکه یا جواهر کافی نیست!", "💸");
  }

  equip(id) {
    if (equipSkin(id)) { AudioSys.play("click"); this.toast("پوسته مجهز شد", "🎨"); this.show("shop"); }
  }

  spinWheel() {
    const res = wheelSpin();
    if (!res) { this.toast("۵۰ سکه کافی نیست!", "💸"); return; }
    AudioSys.play("win");
    this.toast(res.kind === "gems" ? `💎 +${res.n} جواهر!` : `🪙 +${res.n} سکه!`, "🎡");
    this.show("shop");
  }

  openChest() {
    const res = chestOpen("coins");
    if (!res) { this.toast("صندوق هنوز آماده نیست!", "📦"); return; }
    AudioSys.play("coin");
    this.toast("🪙 +۱۲۰ سکه از صندوق!", "📦");
    this.show("shop");
  }

  doPrestige() {
    const p = this.p();
    if (p.level < 5 && p.prestige === 0) { this.toast("برای پرستیژ به سطح ۵ نیاز داری", "🌟"); return; }
    if (!confirm(`پرستیژ به سطح ${p.prestige + 1}؟ (سطوح و ستارهها ریست میشوند اما پوستهها میمانند)`)) return;
    prestige();
    AudioSys.play("levelup");
    this.toast("پرستیژ! 🌟 +۵ جواهر", "🌟");
    checkAchievements({});
    this.show("main");
  }

  // ---------- collection ----------
  collectionBody() {
    const p = this.p();
    const rows = SKINS.map((s) => {
      const owned = p.owned.includes(s.id);
      const eq = p.skin === s.id;
      return `<div class="shop-skin ${owned ? "owned" : "locked"} ${eq ? "eq" : ""}" style="--sc1:${s.colors[0]};--sc2:${s.colors[1]}">
        <div class="skin-icon">${s.icon}</div><div class="skin-name">${s.fa}</div>
        ${eq ? `<div class="skin-state">✔ مجهز</div>` : owned ? `<button class="mini-btn" data-act="equip:${s.id}">مجهز کن</button>` : `<div class="skin-state">🔒 قفل</div>`}
      </div>`;
    }).join("");
    return `<div class="skin-grid">${rows}</div><div class="hint-line">پوستههای افسانهای 🌟 هیچ مزیت بازی ندارند — فقط ظاهر!</div>`;
  }

  afterCollection() {}

  // ---------- achievements ----------
  achievementsBody() {
    const p = this.p();
    const rows = ACHIEVEMENTS.map((a) => {
      const got = p.achievements.includes(a.id);
      return `<div class="ach ${got ? "got" : ""}"><span class="ach-icon">${got ? a.icon : "🔒"}</span><div class="ach-txt"><b>${a.fa}</b><small>${a.desc}</small></div><span class="ach-reward">+${a.reward} 🪙${a.rewardGems ? ` +${a.rewardGems} 💎` : ""}</span></div>`;
    }).join("");
    return `<div class="ach-count">${p.achievements.length}/${ACHIEVEMENTS.length} دستاورد</div><div class="ach-grid">${rows}</div>`;
  }

  // ---------- leaderboard ----------
  leaderboardBody() {
    const p = this.p();
    const entries = [...p.leaderboard].reverse().slice(0, 15);
    const rows = entries.length
      ? entries.map((e, i) => `<div class="lb-row"><span class="lb-rank">${i + 1}</span><span class="lb-score">${fmt(e.score)}</span><span class="lb-date">${e.date}</span></div>`).join("")
      : `<div class="hint-line">هنوز رکوردی ثبت نشده — در حالت بیپایان بازی کن!</div>`;
    return `
      <div class="lb-bests">
        <div class="lb-best"><b>♾ بیپایان</b><span>${fmt(p.best.endless)}</span></div>
        <div class="lb-best"><b>🌞 روزانه</b><span>${fmt(p.best.daily)}</span></div>
        <div class="lb-best"><b>📅 هفتگی</b><span>${fmt(p.best.weekly)}</span></div>
        <div class="lb-best"><b>🗓 ماهانه</b><span>${fmt(p.best.monthly)}</span></div>
        <div class="lb-best"><b>🏆 همیشه</b><span>${fmt(p.best.alltime)}</span></div>
      </div>
      <h3>اخیر</h3><div class="lb-list">${rows}</div>
      <div class="hint-line">اتصال به لیدربورد جهانی LoveHub بهزودی (Cloud Save).</div>`;
  }

  afterLeaderboard() {}

  // ---------- settings ----------
  settingsBody() {
    const s = this.p().settings;
    const t = (k, fa, desc) => `<label class="set-row"><span><b>${fa}</b><small>${desc}</small></span><input type="checkbox" data-toggle="${k}" ${s[k] ? "checked" : ""}></label>`;
    return `
      ${t("sfx", "🎵 افکتها", "صدای بازی")}
      ${t("music", "🎶 موسیقی", "موسیقی تطبیقی دنیاها")}
      ${t("motion", "✨ انیمیشنها", "کاهش انیمیشن برای دستگاههای ضعیف")}
      ${t("battery", "🔋 صرفهجویی باتری", "کاهش افکتها برای ۶۰fps پایدار")}
      ${t("contrast", "🔆 کنتراست بالا", "رنگهای پررنگتر و واضحتر")}
      ${t("colorblind", "👁 حالت کوررنگی", "پالت جایگزین برای موانع")}
      ${t("leftHanded", "✋ چپدست", "جابهجایی دکمههای لمسی")}
      <label class="set-row"><span><b>🎚 سختی</b><small>سرعت بازی</small></span>
        <select data-set="difficulty">${[0.8, 1, 1.25].map((d, i) => `<option value="${d}" ${s.difficulty === d ? "selected" : ""}>${["آسان", "عادی", "سخت"][i]}</option>`).join("")}</select></label>
      <label class="set-row"><span><b>⚡ نرخ فریم</b><small>۶۰ یا ۱۲۰</small></span>
        <select data-set="fps">${[60, 120].map((f) => `<option value="${f}" ${s.fps === f ? "selected" : ""}>${f}</option>`).join("")}</select></label>
      <div class="set-actions">
        <button class="mini-btn" data-act="export-save">📤 خروجی ذخیره (کد)</button>
        <button class="mini-btn" data-act="import-save">📥 ورودی ذخیره (کد)</button>
        <button class="mini-btn danger" data-act="reset-save">🗑 پاک کردن همه</button>
      </div>`;
  }

  afterSettings() {
    this.root.querySelectorAll("[data-toggle]").forEach((c) => c.addEventListener("change", () => this.applyToggle(c.getAttribute("data-toggle"))));
    this.root.querySelectorAll("[data-set]").forEach((sel) => sel.addEventListener("change", () => this.applySetting(`set:${sel.getAttribute("data-set")}:${sel.value}`)));
  }

  applyToggle(k) {
    const p = this.p();
    p.settings[k] = !p.settings[k];
    saveProfile();
    if (k === "sfx" || k === "music") AudioSys.setEnabled(p.settings.sfx, p.settings.music);
    this.renderer.setSettings(p.settings);
    this.applyLive();
  }

  applySetting(act) {
    const [, k, v] = act.split(":");
    const p = this.p();
    p.settings[k] = k === "difficulty" || k === "fps" ? +v : v;
    saveProfile();
    this.applyLive();
  }

  applyLive() {
    const p = this.p();
    this.renderer.setSettings(p.settings);
    this.game.fx.setQuality(p.settings.battery ? 0.5 : 1);
    this.game.difficulty = p.settings.difficulty || 1;
    AudioSys.setEnabled(p.settings.sfx, p.settings.music);
  }

  exportSave() {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(this.p()))));
    navigator.clipboard && navigator.clipboard.writeText(code);
    this.toast("کد ذخیره در کلیپبورد! (در تنظیمات Import کنید)", "📤");
  }

  importSave() {
    const code = prompt("کد ذخیره را وارد کنید:");
    if (!code) return;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      localStorage.setItem("lovehub.snake.v1", JSON.stringify(data));
      location.reload();
    } catch { this.toast("کد نامعتبر است!", "⚠️"); }
  }

  // ---------- daily / quests ----------
  dailyBody() {
    if (!this.daily || this.daily.dateKey !== todayKey()) this.daily = dailyChallenge(todayKey());
    const d = this.daily;
    const p = this.p();
    const done = p.daily.done === todayKey();
    const w = WORLDS[d.worldIdx];
    const q = p.quests && p.questDate === todayKey() ? p.quests : (p.quests = newDailyQuests(), p.questDate = todayKey(), saveProfile(), p.quests);
    const quests = q.map((qq, i) => `<div class="quest ${qq.done ? "done" : ""}"><span>${qq.fa}</span><span class="q-prog">${Math.min(qq.prog, qq.target)}/${qq.target}</span>${qq.done && !qq.claimed ? `<button class="mini-btn" data-act="claim:${i}">دریافت ${qq.reward} 🪙</button>` : qq.claimed ? `<span class="skin-state">✔</span>` : ""}</div>`).join("");
    return `
      <div class="daily-card" style="--c1:${w.c1};--c2:${w.c2}">
        <div class="cin-kicker">🌞 چالش روزانه</div>
        <div class="daily-info">دنیا: <b>${w.fa}</b> — مرحله ${d.levelNum}</div>
        <div class="daily-info">قانون: <b>${d.rule.fa}</b></div>
        <div class="daily-info">جایزه: 🪙 ${d.rewards.coins} + 💎 ${d.rewards.gems}</div>
        ${done ? `<div class="skin-state done-badge">✔ امروز انجام شد (بهترین: ${fmt(p.daily.best)})</div>` : `<button class="menu-btn primary" data-act="daily">🎮 شروع چالش</button>`}
      </div>
      <div class="shop-section"><h3>📋 کوئستهای روزانه</h3><div class="quest-list">${quests}</div></div>`;
  }

  afterDaily() {
    this.root.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => this.action(b.getAttribute("data-act"))));
  }

  claimQuest(i) {
    if (claimQuest(i)) {
      AudioSys.play("coin");
      this.toast("جایزه کوئست دریافت شد!", "🎁");
      this.show("daily");
    }
  }

  // ---------- replays ----------
  replayBody() {
    const runs = this.p().runs;
    const rows = runs.length
      ? runs.map((r, i) => `<div class="lb-row"><span class="lb-rank">${WORLDS[r.worldIdx].fa}</span><span class="lb-score">مرحله ${r.levelNum} — ${fmt(r.score)} ${r.nohit ? "💠" : ""}</span><button class="mini-btn" data-act="replay-run:${i}">▶ بازپخش</button></div>`).join("")
      : `<div class="hint-line">هنوز بازپخشی ثبت نشده — مراحل کمپین را بازی کن!</div>`;
    return `<div class="lb-list">${rows}</div>`;
  }
}
