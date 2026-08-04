// LoveHub Snake — game content: worlds, level generator, skins, achievements, events, quests.
export const LEVELS_PER_WORLD = 10;
export const WORLD_COUNT = 10;

// ---------- deterministic PRNG ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (r, a, b) => a + Math.floor(r() * (b - a + 1));
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const weighted = (r, items) => {
  let total = items.reduce((s, i) => s + i.w, 0);
  let roll = r() * total;
  for (const it of items) { roll -= it.w; if (roll <= 0) return it.v; }
  return items[items.length - 1].v;
};

// ---------- worlds ----------
export const WORLDS = [
  {
    id: "forest", fa: "جنگل سبز", en: "Green Forest",
    c1: "#2e8b57", c2: "#9acd32", bg: ["#0b3d2e", "#14532d"], glow: "#7cff6b",
    weather: "leaves", obstacles: ["spikes", "mwall"],
    music: "forest", desc: "آغاز سفر در جنگل سرسبز",
    enemy: { fa: "گراز وحشی", c: "#8b5a2b", ai: "patrol" },
    boss: { name: "PashaMar", fa: "پادشاه مار", c: "#ffd700", sub: "نگهبان جنگل" },
  },
  {
    id: "frozen", fa: "دره یخی", en: "Frozen Valley",
    c1: "#38bdf8", c2: "#e0f2fe", bg: ["#0c4a6e", "#082f49"], glow: "#a5f3fc",
    weather: "snow", obstacles: ["ice", "spikes", "wind"],
    music: "ice", desc: "سرزمین لغزنده و سرد",
    enemy: { fa: "گرگ یخی", c: "#cbd5e1", ai: "chase" },
    boss: { name: "IceTitan", fa: "تیتان یخی", c: "#bae6fd", sub: "قلب یخبندان" },
  },
  {
    id: "volcano", fa: "آتشفشان", en: "Volcano",
    c1: "#f97316", c2: "#ef4444", bg: ["#450a0a", "#1c0a05"], glow: "#fb923c",
    weather: "embers", obstacles: ["lava", "rocks", "mines"],
    music: "volcano", desc: "رودهای گدازه و سنگهای در حال سقوط",
    enemy: { fa: "شیطان گدازه", c: "#fca5a5", ai: "predict" },
    boss: { name: "FireDragon", fa: "اژدهای آتش", c: "#f87171", sub: "خشم کوهستان" },
  },
  {
    id: "ocean", fa: "معبد اقیانوس", en: "Ocean Temple",
    c1: "#2dd4bf", c2: "#818cf8", bg: ["#082f49", "#0c2340"], glow: "#5eead4",
    weather: "rain", obstacles: ["wind", "teleport", "spikes"],
    music: "ocean", desc: "جریانهای آب و تلههای باستانی",
    enemy: { fa: "نگهبان مرجان", c: "#f472b6", ai: "ambush" },
    boss: { name: "Leviathan", fa: "لویاتان اعماق", c: "#6ee7b7", sub: "مار هیولایی دریا" },
  },
  {
    id: "space", fa: "فضای ژرف", en: "Deep Space",
    c1: "#a78bfa", c2: "#22d3ee", bg: ["#1e1b4b", "#0f172a"], glow: "#c4b5fd",
    weather: "meteors", obstacles: ["darkness", "magnet", "mines"],
    music: "space", desc: "گرانش صفر و تاریکی بیپایان",
    enemy: { fa: "بیگانه", c: "#a5f3fc", ai: "predict" },
    boss: { name: "Nebula", fa: "هیولای فضایی", c: "#c084fc", sub: "بلعندهی ستارگان" },
  },
  {
    id: "cyber", fa: "شهر سایبری", en: "Cyber City",
    c1: "#22d3ee", c2: "#f472b6", bg: ["#0f172a", "#1e1b4b"], glow: "#67e8f9",
    weather: "neonrain", obstacles: ["lasers", "mwall", "mines"],
    music: "cyber", desc: "لیزرهای چرخان و دیوارهای متحرک",
    enemy: { fa: "سنتینل", c: "#f0abfc", ai: "coordinate" },
    boss: { name: "Cyborg", fa: "ربات هوشمند", c: "#67e8f9", sub: "هوش مصنوعی شهر" },
  },
  {
    id: "shadow", fa: "آزمایشگاه سایه", en: "Shadow Lab",
    c1: "#a855f7", c2: "#14b8a6", bg: ["#1e0a2e", "#0b1020"], glow: "#e879f9",
    weather: "fog", obstacles: ["poison", "darkness", "teleport"],
    music: "shadow", desc: "مخفیگاه پادشاه سایه",
    enemy: { fa: "سایه", c: "#94a3b8", ai: "ambush" },
    boss: { name: "ShadowKing", fa: "پادشاه سایه", c: "#a78bfa", sub: "فرمانروای تاریکی" },
  },
  {
    id: "desert", fa: "ویرانههای صحرا", en: "Desert Ruins",
    c1: "#f59e0b", c2: "#b45309", bg: ["#422006", "#1c1917"], glow: "#fcd34d",
    weather: "sandstorm", obstacles: ["wind", "spikes", "rocks"],
    music: "desert", desc: "طوفان شن و دژهای فراموششده",
    enemy: { fa: "عقرب", c: "#fbbf24", ai: "patrol" },
    boss: { name: "SandWraith", fa: "شیطان شن", c: "#fcd34d", sub: "خشم صحرا" },
  },
  {
    id: "dream", fa: "دنیای رویا", en: "Dream World",
    c1: "#f472b6", c2: "#38bdf8", bg: ["#3b0764", "#0f172a"], glow: "#f9a8d4",
    weather: "aurora", obstacles: ["teleport", "rainbow", "mwall"],
    music: "dream", desc: "رنگهای خیالی و درهای جادویی",
    enemy: { fa: "کابوس", c: "#c4b5fd", ai: "chase" },
    boss: { name: "DreamEater", fa: "گاردین رویا", c: "#f0abfc", sub: "حافظ دنیای رویا" },
  },
  {
    id: "final", fa: "بُعد نهایی", en: "Final Dimension",
    c1: "#fde047", c2: "#a855f7", bg: ["#1a120b", "#000000"], glow: "#fef08a",
    weather: "golden", obstacles: ["everything"],
    music: "final", desc: "آخرین نبرد برای تاج سلطنت",
    enemy: { fa: "نگهبان تاج", c: "#fde047", ai: "coordinate" },
    boss: { name: "CosmicEmperor", fa: "امپراطور مار کیهانی", c: "#fef08a", sub: "خالق همهی دنیاها" },
  },
];

export const worldById = (id) => WORLDS.find((w) => w.id === id);

// ---------- power-ups ----------
export const POWERUPS = {
  speed:   { fa: "تندرو",  icon: "⚡", color: "#fde047", dur: 6 },
  shield:  { fa: "سپر",    icon: "🛡", color: "#60a5fa", dur: 8 },
  magnet:  { fa: "آهنربا", icon: "🧲", color: "#f472b6", dur: 7 },
  life:    { fa: "جان+",   icon: "❤️", color: "#f87171", dur: 0 },
  fire:    { fa: "مار آتش", icon: "🔥", color: "#fb923c", dur: 6 },
  freeze:  { fa: "انجماد", icon: "❄", color: "#7dd3fc", dur: 4 },
  slow:    { fa: "آهسته",  icon: "⏳", color: "#a5b4fc", dur: 5 },
  ghost:   { fa: "شبح",    icon: "👻", color: "#c4b5fd", dur: 5 },
  shock:   { fa: "موج شوک", icon: "💥", color: "#fbbf24", dur: 0 },
  frenzy:  { fa: "رنگینکمان", icon: "🌈", color: "#f0abfc", dur: 7 },
};
export const POWERUP_WEIGHTS = [
  { v: "speed", w: 16 }, { v: "shield", w: 14 }, { v: "magnet", w: 12 },
  { v: "life", w: 6 }, { v: "fire", w: 9 }, { v: "freeze", w: 10 },
  { v: "slow", w: 9 }, { v: "ghost", w: 9 }, { v: "shock", w: 8 }, { v: "frenzy", w: 7 },
];

// ---------- level generation ----------
export function genLevel(worldIdx, levelNum, seed, mode = "campaign") {
  const r = mulberry32(seed);
  const world = WORLDS[worldIdx];
  const d = Math.min(levelNum - 1, 9); // difficulty 0..9 within world
  const g = worldIdx * 10 + levelNum;   // global level 1..100
  const isBoss = levelNum === LEVELS_PER_WORLD;
  const cols = 18 + Math.min(Math.floor((g - 1) / 4), 7);
  const rows = 18 + Math.min(Math.floor((g - 1) / 5), 6);

  const level = {
    worldIdx, levelNum, seed, mode, cols, rows,
    speed: Math.min(4.2 + g * 0.18 + (mode === "endless" ? 1.2 : 0), 13),
    objectives: [], static: [], lava: [], spikes: [], ice: [], wind: [],
    teleporters: [], mines: [], lasers: [], poison: [],
    foods: [], gems: [], keys: [], portal: null, powerups: [],
    enemies: [], secret: null, darkness: false, fog: false,
    boss: null, timeLimit: 0,
  };

  const blocked = new Set();
  const inB = (x, y) => blocked.has(x + "," + y);
  const addWall = (x, y) => { blocked.add(x + "," + y); level.static.push({ x, y }); };
  const free = (x, y) =>
    x > 0 && x < cols - 1 && y > 0 && y < rows - 1 && !inB(x, y);

  // border walls
  for (let x = 0; x < cols; x++) { addWall(x, 0); addWall(x, rows - 1); }
  for (let y = 0; y < rows; y++) { addWall(0, y); addWall(cols - 1, y); }

  // spawn: snake starts bottom-center, moving up
  const sx = Math.floor(cols / 2), sy = rows - 3;

  // ----- static obstacles per world + difficulty -----
  const obstacleBudget = 4 + d + worldIdx;
  const pool = world.obstacles;
  const everything = pool[0] === "everything";
  let placed = 0, guard = 0;
  while (placed < obstacleBudget && guard++ < 400) {
    const o = everything
      ? ["spikes", "mines", "ice", "lava", "mwall", "teleport", "laser", "wind"][randInt(r, 0, 7)]
      : pick(r, pool);
    const x = randInt(r, 1, cols - 2), y = randInt(r, 1, rows - 2);
    if (!free(x, y)) continue;
    if (Math.abs(x - sx) < 3 && y > sy - 4) continue;
    if (o === "spikes" && worldIdx > 0) { level.spikes.push({ x, y }); blocked.add(x + "," + y); placed++; }
    else if (o === "lava") { level.lava.push({ x, y }); blocked.add(x + "," + y); placed++; }
    else if (o === "poison") { level.poison.push({ x, y }); blocked.add(x + "," + y); placed++; }
    else if (o === "ice") { level.ice.push({ x, y }); placed += 0.25; }
    else if (o === "wind") { level.wind.push({ x, y, dx: r() > 0.5 ? 1 : -1, dy: 0 }); placed++; }
    else if (o === "mines" && g >= 8) { level.mines.push({ x, y, fuse: 0 }); blocked.add(x + "," + y); placed++; }
    else if (o === "mwall" && g >= 4) {
      const horizontal = r() > 0.5;
      level.movingWalls = level.movingWalls || [];
      level.movingWalls.push({
        x, y, px: x, py: y, len: randInt(r, 2, 4), axis: horizontal ? "x" : "y",
        dir: r() > 0.5 ? 1 : -1, speed: 0.5 + r(), cells: [],
      });
      placed++;
    } else if (o === "laser" && g >= 12) {
      const horizontal = r() > 0.5;
      level.lasers.push({ x, y, axis: horizontal ? "x" : "y", len: randInt(r, 2, 5), period: 2.2 + r(), phase: r() * 6.28 });
      placed++;
    } else if (o === "teleport" && g >= 16) {
      let tx = randInt(r, 1, cols - 2), ty = randInt(r, 1, rows - 2);
      if (free(tx, ty) && !(Math.abs(tx - sx) < 3 && ty > sy - 4)) {
        level.teleporters.push({ x, y, tx, ty, dx: tx - x, dy: ty - y });
        placed++;
      }
    }
  }
  if (world.obstacles.includes("darkness") && g >= 10) level.darkness = true;
  if (world.weather === "fog") level.fog = true;

  // ----- objectives -----
  const picks = [];
  if (isBoss) {
    level.objectives.push({ type: "boss", target: 1, current: 0 });
  } else {
    const opts = [
      { v: { type: "eat", target: Math.min(6 + g, 40) }, w: 40 },
      { v: { type: "length", target: Math.min(10 + g, 60) }, w: 26 },
      { v: { type: "survive", seconds: Math.min(18 + g * 2, 120) }, w: 22 },
      { v: { type: "time", seconds: Math.min(45 + g * 3, 180) }, w: 20 },
      { v: { type: "nohit" }, w: 14 },
      { v: { type: "keys" }, w: 16 },
    ];
    const count = d >= 7 ? 3 : d >= 3 ? 2 : 1;
    while (picks.length < count) {
      const o = weighted(r, opts);
      if (picks.some((p) => p.type === o.type)) continue;
      picks.push(o);
    }
    level.objectives = picks;
  }
  // keys/portal objective needs keys + portal; time objective needs a portal
  if (level.objectives.some((o) => o.type === "keys" || o.type === "portal" || o.type === "time")) {
    const px2 = randInt(r, 1, cols - 2), py2 = randInt(r, 1, Math.max(2, rows - 6));
    if (free(px2, py2)) {
      level.portal = { x: px2, y: py2 };
      if (level.objectives.some((o) => o.type === "keys" || o.type === "portal")) {
        const kx = randInt(r, 1, cols - 2), ky = randInt(r, 2, rows - 4);
        if (free(kx, ky)) {
          level.keys.push({ x: kx, y: ky });
          level.objectives = level.objectives.filter((o) => o.type !== "portal");
          if (!level.objectives.some((o) => o.type === "keys")) {
            level.objectives.push({ type: "keys", target: 1, current: 0 });
          }
        } else {
          level.objectives = level.objectives.filter((o) => o.type !== "keys" && o.type !== "time");
        }
      }
    } else {
      level.objectives = level.objectives.filter((o) => o.type !== "keys" && o.type !== "time");
    }
  }
  if (level.objectives.some((o) => o.type === "time")) {
    level.timeLimit = level.objectives.find((o) => o.type === "time").seconds;
  }

  // ----- entities -----
  const foodCount = 4 + Math.min(d, 6) + (level.objectives.some((o) => o.type === "eat") ? 8 : 0);
  let foodGuard = 0;
  while (level.foods.length < foodCount && foodGuard++ < 200) {
    const x = randInt(r, 1, cols - 2), y = randInt(r, 1, rows - 2);
    if (!free(x, y) || (Math.abs(x - sx) < 3 && y > sy - 3)) continue;
    level.foods.push({ x, y, kind: "apple" });
  }
  const gemN = Math.min(2 + Math.floor(d / 2), 6);
  let gemGuard = 0;
  while (level.gems.length < gemN && gemGuard++ < 200) {
    const x = randInt(r, 1, cols - 2), y = randInt(r, 1, rows - 2);
    if (!free(x, y)) continue;
    level.gems.push({ x, y });
  }
  const enemyN = Math.max(0, Math.min(1 + Math.floor((g - 4) / 8), 4));
  const ais = ["patrol", "chase", "predict", "ambush", "coordinate"];
  for (let i = 0; i < enemyN; i++) {
    const x = randInt(r, 1, cols - 2), y = randInt(r, 2, rows - 4);
    if (!free(x, y) || (Math.abs(x - sx) < 4 && y > sy - 4)) { i--; continue; }
    level.enemies.push({ x, y, px: x, py: y, ai: pick(r, ais), c: world.enemy.c, hp: 1, dir: { x: 1, y: 0 }, cd: 0 });
  }
  // power-up spawn points (2-3)
  for (let i = 0; i < 3; i++) {
    const x = randInt(r, 1, cols - 2), y = randInt(r, 1, rows - 2);
    if (!free(x, y)) continue;
    level.powerups.push({ x, y, type: weighted(r, POWERUP_WEIGHTS), taken: false });
  }
  // secret room (hidden collectible) ~20%
  if (r() < 0.2 + d * 0.01 && g >= 6) {
    const x = randInt(r, 2, cols - 3), y = randInt(r, 2, rows - 3);
    if (free(x, y)) level.secret = { x, y, kind: "treasure", found: false };
  }

  // boss level: bigger arena + boss def
  if (isBoss) {
    level.boss = {
      name: world.boss.name, fa: world.boss.fa, sub: world.boss.sub, c: world.boss.c,
      maxHp: 3 + Math.floor(worldIdx / 2), hp: 3 + Math.floor(worldIdx / 2),
      phases: 3, arena: { x: Math.floor(cols / 2), y: Math.floor(rows / 3) },
    };
  }
  return level;
}

// ---------- skins (premium collection) ----------
// head: round | visor | crown | horns | fang | crystal | drone | blade | ember | royal
// pattern: none | stripes | diamond | scales | hex | pulse
export const SKINS = [
  { id: "classic", fa: "کلاسیک", colors: ["#22c55e", "#16a34a"], price: 0, icon: "🐍", eyes: "normal", head: "round", pattern: "none", glow: 6 },
  { id: "pixel", fa: "پیکسلی", colors: ["#4ade80", "#15803d"], price: 100, icon: "🟩", eyes: "square", head: "visor", pattern: "none", glow: 4 },
  { id: "neon", fa: "نئون", colors: ["#22d3ee", "#6366f1"], price: 250, icon: "💠", eyes: "glow", head: "visor", pattern: "hex", glow: 16, trail: "neon" },
  { id: "rose", fa: "رز", colors: ["#fb7185", "#be123c"], price: 300, icon: "🌸", eyes: "normal", head: "round", pattern: "scales", glow: 7 },
  { id: "gold", fa: "طلایی افسانهای", colors: ["#fde047", "#d97706"], price: 800, currency: "gems", icon: "👑", eyes: "star", head: "crown", pattern: "diamond", glow: 22, trail: "gold", legendary: true },
  { id: "ice", fa: "کریستال یخی", colors: ["#a5f3fc", "#38bdf8"], price: 350, icon: "❄️", eyes: "glow", head: "crystal", pattern: "scales", glow: 18, trail: "ice" },
  { id: "fire", fa: "مار آتشین", colors: ["#fb923c", "#ef4444"], price: 400, icon: "🔥", eyes: "fire", head: "horns", pattern: "pulse", glow: 20, trail: "fire", legendary: true },
  { id: "shadow", fa: "شبح سایه", colors: ["#c4b5fd", "#6d28d9"], price: 600, currency: "gems", icon: "🌑", eyes: "glow", head: "fang", pattern: "none", glow: 20, trail: "shadow", legendary: true },
  { id: "rainbow", fa: "رنگینکمان", colors: ["#f472b6", "#22d3ee"], price: 0, icon: "🌈", eyes: "star", head: "round", pattern: "rainbow", glow: 18, trail: "rainbow", unlock: "achievement:rainbow_rider", legendary: true },
  { id: "pumpkin", fa: "کدو تنبل", colors: ["#fb923c", "#7c2d12"], price: 0, icon: "🎃", eyes: "square", head: "round", pattern: "none", glow: 10, unlock: "event:halloween", seasonal: true },
  { id: "snowflake", fa: "دانه برف", colors: ["#e0f2fe", "#0ea5e9"], price: 0, icon: "☃️", eyes: "normal", head: "crystal", pattern: "scales", glow: 12, unlock: "event:christmas", seasonal: true },
  { id: "candy", fa: "آبنبات", colors: ["#f9a8d4", "#a78bfa"], price: 500, icon: "🍬", eyes: "normal", head: "round", pattern: "stripes", glow: 8 },
  { id: "cyber", fa: "سایبر", colors: ["#67e8f9", "#e879f9"], price: 550, icon: "🤖", eyes: "glow", head: "visor", pattern: "hex", glow: 18, trail: "neon" },
  { id: "space", fa: "فضایی", colors: ["#c084fc", "#1e1b4b"], price: 650, icon: "🚀", eyes: "star", head: "drone", pattern: "diamond", glow: 18, trail: "shadow" },
  { id: "royal", fa: "شاهانه", colors: ["#f0abfc", "#7c3aed"], price: 1200, currency: "gems", icon: "💜", eyes: "star", head: "royal", pattern: "diamond", glow: 24, trail: "gold", legendary: true },
  { id: "galaxy", fa: "کهکشانی", colors: ["#818cf8", "#0f172a"], price: 0, icon: "🌌", eyes: "star", head: "crystal", pattern: "diamond", glow: 26, trail: "neon", unlock: "achievement:world5", legendary: true, desc: "از دل ستارهها" },
  { id: "dark", fa: "افسانهای تاریک", colors: ["#334155", "#0b1120"], price: 1500, currency: "gems", icon: "🖤", eyes: "fire", head: "horns", pattern: "hex", glow: 28, trail: "shadow", legendary: true, desc: "مار افسانهای از اعماق تاریکی" },
  { id: "cosmic", fa: "کیهانی", colors: ["#22d3ee", "#1e1b4b"], price: 900, currency: "gems", icon: "🌌", eyes: "star", head: "drone", pattern: "hex", glow: 22, trail: "shadow", unlock: "prestige:1", legendary: true },
  { id: "prism", fa: "منشور", colors: ["#fef08a", "#f0abfc"], price: 0, icon: "💎", eyes: "star", head: "crystal", pattern: "rainbow", glow: 22, trail: "gold", unlock: "achievement:completionist", legendary: true },
];

export const skinById = (id) => SKINS.find((s) => s.id === id);

// ---------- achievements ----------
export const ACHIEVEMENTS = [
  { id: "first_apple", fa: "اولین سیب", desc: "اولین سیب را بخور", icon: "🍎", reward: 50, check: (p) => p.stats.apples >= 1 },
  { id: "apple_master", fa: "استاد سیب", desc: "۱۰۰ سیب بخور", icon: "🍏", reward: 200, check: (p) => p.stats.apples >= 100 },
  { id: "snake_20", fa: "مار ۲۰تایی", desc: "طول مار به ۲۰ برسد", icon: "🐍", reward: 100, check: (p) => p.stats.maxLength >= 20 },
  { id: "snake_50", fa: "مار ۵۰تایی", desc: "طول مار به ۵۰ برسد", icon: "🐲", reward: 250, check: (p) => p.stats.maxLength >= 50 },
  { id: "snake_100", fa: "افسانه مار", desc: "طول مار به ۱۰۰ برسد", icon: "🐉", reward: 600, rewardGems: 2, check: (p) => p.stats.maxLength >= 100 },
  { id: "combo_5", fa: "ترکیب ۵", desc: "ترکیب ۵ بدون وقفه", icon: "5️⃣", reward: 100, check: (p) => p.stats.bestCombo >= 5 },
  { id: "combo_20", fa: "پادشاه ترکیب", desc: "ترکیب ۲۰ بدون وقفه", icon: "🎯", reward: 400, rewardGems: 1, check: (p) => p.stats.bestCombo >= 20 },
  { id: "first_win", fa: "اولین پیروزی", desc: "اولین مرحله را کامل کن", icon: "🏁", reward: 100, check: (p) => p.stats.levelsWon >= 1 },
  { id: "world1", fa: "فاتح جنگل", desc: "دنیای ۱ را کامل کن", icon: "🌿", reward: 200, check: (p) => p.stars[0] >= 10 },
  { id: "world2", fa: "فاتح یخ", desc: "دنیای ۲ را کامل کن", icon: "❄️", reward: 200, check: (p) => p.stars[1] >= 10 },
  { id: "world3", fa: "فاتح آتش", desc: "دنیای ۳ را کامل کن", icon: "🔥", reward: 250, check: (p) => p.stars[2] >= 10 },
  { id: "world4", fa: "فاتح اقیانوس", desc: "دنیای ۴ را کامل کن", icon: "🌊", reward: 250, check: (p) => p.stars[3] >= 10 },
  { id: "world5", fa: "فاتح فضا", desc: "دنیای ۵ را کامل کن", icon: "🌌", reward: 300, rewardGems: 1, check: (p) => p.stars[4] >= 10 },
  { id: "world6", fa: "فاتح سایبر", desc: "دنیای ۶ را کامل کن", icon: "🤖", reward: 300, check: (p) => p.stars[5] >= 10 },
  { id: "world7", fa: "فاتح سایه", desc: "دنیای ۷ را کامل کن", icon: "🌑", reward: 350, rewardGems: 1, check: (p) => p.stars[6] >= 10 },
  { id: "world8", fa: "فاتح صحرا", desc: "دنیای ۸ را کامل کن", icon: "🏜️", reward: 350, check: (p) => p.stars[7] >= 10 },
  { id: "world9", fa: "فاتح رویا", desc: "دنیای ۹ را کامل کن", icon: "🌈", reward: 400, rewardGems: 1, check: (p) => p.stars[8] >= 10 },
  { id: "world10", fa: "فاتح نهایی", desc: "دنیای ۱۰ را کامل کن", icon: "👑", reward: 1000, rewardGems: 5, check: (p) => p.stars[9] >= 10 },
  { id: "boss_1", fa: "شکارچی باس", desc: "اولین باس را شکست بده", icon: "🗡️", reward: 200, check: (p) => p.stats.bosses >= 1 },
  { id: "boss_10", fa: "باسشکن", desc: "۱۰ باس را شکست بده", icon: "⚔️", reward: 600, rewardGems: 2, check: (p) => p.stats.bosses >= 10 },
  { id: "endless_100", fa: "بیپایان ۱۰۰", desc: "امتیاز ۱۰۰ در حالت بیپایان", icon: "♾️", reward: 100, check: (p) => p.best.endless >= 100 },
  { id: "endless_2000", fa: "بیپایان ۲۰۰۰", desc: "امتیاز ۲۰۰۰ در حالت بیپایان", icon: "🏆", reward: 800, rewardGems: 3, check: (p) => p.best.endless >= 2000 },
  { id: "untouchable", fa: "دستنخورده", desc: "یک مرحله بدون آسیب کامل کن", icon: "💠", reward: 300, check: (p) => p.stats.nohits >= 1 },
  { id: "collector", fa: "جواهرچین", desc: "۵۰ جواهر جمع کن", icon: "💎", reward: 200, check: (p) => p.stats.gems >= 50 },
  { id: "key_master", fa: "کلیددار", desc: "۵ کلید جمع کن", icon: "🔑", reward: 150, check: (p) => p.stats.keys >= 5 },
  { id: "powerup_25", fa: "قدرت ۲۵", desc: "۲۵ پاورآپ بگیر", icon: "💊", reward: 150, check: (p) => p.stats.powerups >= 25 },
  { id: "secret_3", fa: "کاوشگر", desc: "۳ اتاق مخفی پیدا کن", icon: "🗝️", reward: 200, check: (p) => p.stats.secrets >= 3 },
  { id: "rich", fa: "خزانهدار", desc: "۱۰۰۰۰ سکه جمع کن", icon: "💰", reward: 300, check: (p) => p.stats.coinsEarned >= 10000 },
  { id: "streak_3", fa: "بازیکن منظم", desc: "۳ روز متوالی وارد شو", icon: "📅", reward: 150, check: (p) => p.login.streak >= 3 },
  { id: "streak_7", fa: "هفت روز", desc: "۷ روز متوالی وارد شو", icon: "🗓️", reward: 400, rewardGems: 1, check: (p) => p.login.streak >= 7 },
  { id: "prestige_1", fa: "افسانهی نو", desc: "اولین پرستیژ", icon: "🌟", reward: 500, rewardGems: 2, check: (p) => p.prestige >= 1 },
  { id: "prestige_3", fa: "پرستیژ ۳", desc: "پرستیژ ۳", icon: "🌠", reward: 1000, rewardGems: 5, check: (p) => p.prestige >= 3 },
  { id: "rainbow_rider", fa: "سوار رنگینکمان", desc: "۳ بار رنگینکمان فعال کن", icon: "🌈", reward: 400, rewardGems: 1, check: (p) => p.stats.frenzies >= 3 },
  { id: "completionist", fa: "کاملکننده", desc: "۱۰۰ ستاره جمع کن", icon: "💎", reward: 2000, rewardGems: 10, check: (p) => totalStars(p) >= 100 },
  { id: "daily_1", fa: "چالش روز", desc: "اولین چالش روزانه", icon: "🌞", reward: 100, check: (p) => p.stats.dailies >= 1 },
  { id: "golden_apple", fa: "سیب طلایی", desc: "۱۰ سیب طلایی بخور", icon: "✨", reward: 200, check: (p) => p.stats.goldenApples >= 10 },
  { id: "wheel_spin", fa: "چرخ بخت", desc: "۱ بار چرخ بخت بچرخان", icon: "🎡", reward: 100, check: (p) => p.stats.wheelSpins >= 1 },
];
export function totalStars(p) { return p.stars.reduce((s, x) => s + x, 0); }

// ---------- daily challenge ----------
export function dailyChallenge(dateKey) {
  let h = 0;
  for (const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = mulberry32(h);
  const worldIdx = randInt(r, 0, WORLD_COUNT - 1);
  const levelNum = randInt(r, 1, LEVELS_PER_WORLD - 1);
  const seed = randInt(r, 1, 999999);
  const rules = [
    { fa: "سرعت دو برابر", mult: 1.6 },
    { fa: "فقط یک جان", mult: 1 },
    { fa: "سیبهای طلایی", gold: true },
    { fa: "کمبود پاورآپ", sparse: true },
  ];
  const rule = pick(r, rules);
  const level = genLevel(worldIdx, levelNum, seed, "daily");
  level.speed = Math.min(level.speed * (rule.mult || 1), 15);
  if (rule.gold) level.foods.forEach((f) => (f.kind = "gold"));
  if (rule.sparse) level.powerups = level.powerups.slice(0, 1);
  return { dateKey, worldIdx, levelNum, seed, rule, level, rewards: { coins: 150 + levelNum * 10, gems: 1 } };
}

// ---------- quests ----------
export function newDailyQuests() {
  const defs = [
    { id: "play3", fa: "۳ مرحله بازی کن", target: 3, reward: 100, stat: "plays" },
    { id: "eat50", fa: "۵۰ سیب بخور", target: 50, reward: 120, stat: "apples" },
    { id: "powerup2", fa: "۲ پاورآپ بگیر", target: 2, reward: 100, stat: "powerups" },
    { id: "win1", fa: "۱ مرحله را کامل کن", target: 1, reward: 150, stat: "levelsWon" },
    { id: "boss1", fa: "۱ باس را شکست بده", target: 1, reward: 200, stat: "bosses" },
    { id: "endless200", fa: "۲۰۰ امتیاز بیپایان", target: 200, reward: 150, stat: "endlessScore" },
  ];
  const idx = Math.floor(Math.random() * defs.length);
  const chosen = [defs[idx], defs[(idx + 1) % defs.length], defs[(idx + 2) % defs.length]];
  return chosen.map((d) => ({ ...d, prog: 0, done: false, claimed: false }));
}

// ---------- seasonal events ----------
export function eventInfo() {
  const now = new Date();
  const m = now.getMonth(), d = now.getDate();
  const week = Math.floor(Date.now() / (7 * 86400000));
  if ((m === 9 && d >= 25) || (m === 10 && d <= 2)) return { id: "halloween", fa: "جشن هالووین", icon: "🎃", palette: ["#f97316", "#7c2d12"] };
  if ((m === 11 && d >= 20) || (m === 0 && d <= 3)) return { id: "christmas", fa: "کریسمس", icon: "🎄", palette: ["#22c55e", "#ef4444"] };
  if (week % 8 === 0) return { id: "golden", fa: "جشن سیب طلایی", icon: "✨", gold: true };
  if (week % 8 === 4) return { id: "space", fa: "هفتهی فضا", icon: "🚀" };
  return null;
}
