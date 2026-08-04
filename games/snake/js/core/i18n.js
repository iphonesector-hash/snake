// LoveHub Snake — lightweight i18n (English / فارسی) with lang persistence.
import { profile, saveProfile } from "./state.js";

let LANG = "fa"; // default until profile loaded

export function isFa() { return LANG === "fa"; }

export function setLang(l) {
  LANG = l === "en" ? "en" : "fa";
  const p = profile();
  p.settings = p.settings || {};
  p.settings.lang = LANG;
  saveProfile();
  applyLang();
}

// read current lang from profile without triggering save
export function getLang() {
  const p = profile();
  return (p.settings && p.settings.lang) || LANG;
}

export function applyLang() {
  const l = getLang();
  LANG = l;
  try {
    document.documentElement.lang = l === "en" ? "en" : "fa";
    document.documentElement.dir = l === "en" ? "ltr" : "rtl";
  } catch { /* non-browser */ }
}

// ---------- dictionary ----------
const D = {
  en: {
    tagline: "Premium Edition",
    campaign: "Campaign", endless: "Endless Mode", daily: "Daily Challenge",
    worlds: "World Map", shop: "Shop", collection: "Collection",
    achievements: "Achievements", leaderboard: "Scores", replay: "Replays",
    settings: "Settings", backMenu: "← Menu", back: "← Back",
    level: "Level {n}", levelFmt: "Level {n}", xp: "Level {n} — {a}/{b} XP",
    activeEvent: "Active event: {n}", streak: "🔥 {n}-day streak",
    loginCta: "Log in today for a reward!", wins: "{n} wins",
    loginReward: "Daily login reward: +{n} coins 🎁",
    resetConfirm: "Delete all progress?",
    boosterActive: "⏫ Booster «{n}» activated!",
    replayToast: "🎬 Replay…",
    score: "Score:", replayBadge: "🎬 Replay",
    strikeReady: "⚡ Strike ready — hit the boss head!",
    bossCores: "🔋 {n}/3 energy — the body is dangerous",
    bossEat: "🔋 Eat the boss energy cores (purple)",
    objEat: "{n} apples", objLength: "Length {n}", objSurvive: "Survive {n}s",
    objTime: "Finish in time", objNohit: "No damage",
    objKeys: "{a}/{n} keys", objBoss: "Defeat the boss",
    powerupOn: "{icon} {n} activated", eventOn: "{icon} Event: {n}",
    bossPhase: "💢 Boss entered phase {n}!", bossDown: "Boss defeated! 🎉",
    secretFound: "🗝 Secret room! +150 points",
    shieldBreak: "Shield broken!", respawn: "Continue with a fresh life!",
    portalReached: "Portal activated!",
    endlessRegen: "♾ Endless stage {n} — faster!",
    pause: "⏸ Paused", resume: "▶ Resume", retry: "🔄 Retry", menu: "🏠 Menu",
    achievement: "Achievement: {n} (+{c} 🪙)",
    worldComplete: "🎉 World «{n}» complete!",
    victory: "Victory!", defeat: "Defeated!", nextLevel: "➡ Next Level",
    bestEndless: "Best endless: {n}", tryAgain: "🔄 Try Again",
    newWorld: "New World", bossBattle: "☠ Boss Battle",
    skinsTitle: "🎨 Snake Skins", wheelTitle: "🎡 Daily Lucky Wheel",
    wheelCost: "(once per 24 hours)", spin: "🎡 Spin (50 🪙)",
    frags: "🧩 Skin shards: {a}/8 • ⏫ Boosters: {b}",
    chestTitle: "📦 Coin Chest", chestCost: "(every 4 hours)",
    openChest: "📦 Open (+120 🪙)", prestigeTitle: "🌟 Prestige",
    prestigeCost: "(resets progress)",
    prestigeBtn: "🌟 Prestige: Level 1 → Level {n}",
    free: "Free", equip: "Equip", equipped: "✔ Equipped",
    unlockAch: "🔓 Unlock via achievement", unlockEvent: "🎉 Seasonal event",
    unlockPrestige: "🌟 Prestige", locked: "🔒 Locked",
    needCoins: "Not enough coins or gems!",
    unlockFirst: "Unlock the requirement first!",
    bought: "Skin «{n}» purchased!", equippedToast: "Skin equipped",
    noCoins: "Not enough coins!", cooldown: "Next spin in {n}",
    wheelKicker: "Daily Lucky Wheel",
    wheelBooster: "Booster «{n}» saved — auto-activates next run",
    chestNotReady: "Chest not ready yet!",
    chestGot: "🪙 +120 coins from chest!",
    prestigeNeed: "Reach level 5 for prestige",
    prestigeConfirm: "Prestige to level {n}? (levels and stars reset, skins stay)",
    prestigeDone: "Prestige! 🌟 +5 gems",
    collectionHint: "Legendary skins 🌟 give no gameplay advantage — just looks! Tap a skin to preview.",
    achCount: "{a}/{b} achievements",
    lbEmpty: "No scores yet — play Endless mode!",
    lbEndless: "♾ Endless", lbDaily: "🌞 Daily", lbWeekly: "📅 Weekly",
    lbMonthly: "🗓 Monthly", lbAlltime: "🏆 All-time", recent: "Recent",
    cloudSoon: "Global LoveHub leaderboard coming soon (Cloud Save).",
    sSfx: "🎵 Sound FX", sSfxD: "Game sound effects",
    sMusic: "🎶 Music", sMusicD: "Adaptive world music",
    sMotion: "✨ Animations", sMotionD: "Reduce animations on weak devices",
    sBattery: "🔋 Battery saver", sBatteryD: "Fewer effects for stable 60fps",
    sContrast: "🔆 High contrast", sContrastD: "Bolder, clearer colors",
    sColorblind: "👁 Color-blind mode", sColorblindD: "Alternative obstacle palette",
    sLeft: "✋ Left-handed", sLeftD: "Flip the touch controls",
    sDrag: "🖐 Finger steering", sDragD: "Snake follows your finger (on) or swipe to steer (off)",
    sDiff: "🎚 Difficulty", sDiffD: "Game speed",
    diffEasy: "Easy", diffNormal: "Normal", diffHard: "Hard",
    sFps: "⚡ Frame rate", sFpsD: "60 or 120",
    sLang: "🌐 Language", sLangD: "English / فارسی",
    exportSave: "📤 Export save (code)", importSave: "📥 Import save (code)",
    resetAll: "🗑 Reset all",
    exportToast: "Save code copied! (Import in settings)",
    importPrompt: "Enter save code:", invalidCode: "Invalid code!",
    dailyKicker: "🌞 Daily Challenge",
    dailyWorld: "World: {a} — Level {b}", dailyRule: "Rule: {a}",
    dailyReward: "Reward: 🪙 {a} + 💎 {b}",
    dailyDone: "✔ Done today (best: {n})", startChallenge: "🎮 Start Challenge",
    questsTitle: "📋 Daily Quests", claim: "Claim {n} 🪙",
    questClaimed: "Quest reward claimed!",
    replayEmpty: "No replays yet — play campaign levels!",
    replayBtn: "▶ Replay", lvl: "Level {n}",
    langPickTitle: "Choose Language", langPickDesc: "انتخاب زبان",
    continueBtn: "Continue",
    survivalDone: "⏱ You survived! +500", speedOver: "⏱ Speed surge ended",
    treasureGot: "🪙 +150", needKey: "Key required!", timeUp: "⏳ Time's up!",
  },
  fa: {
    tagline: "نسخهی نهایی پرمیوم",
    campaign: "کمپین", endless: "حالت بیپایان", daily: "چالش روزانه",
    worlds: "نقشه دنیاها", shop: "فروشگاه", collection: "مجموعه",
    achievements: "دستاوردها", leaderboard: "امتیازها", replay: "بازپخشها",
    settings: "تنظیمات", backMenu: "← منو", back: "← بازگشت",
    level: "سطح {n}", levelFmt: "سطح {n}", xp: "سطح {n} — {a}/{b} XP",
    activeEvent: "رویداد فعال: {n}", streak: "🔥 {n} روز متوالی",
    loginCta: "امروز وارد شو تا پاداش بگیری!", wins: "{n} برد",
    loginReward: "پاداش ورود روزانه: +{n} سکه 🎁",
    resetConfirm: "همه پیشرفتها حذف شود؟",
    boosterActive: "⏫ بوستر «{n}» فعال شد!",
    replayToast: "🎬 بازپخش...",
    score: "امتیاز:", replayBadge: "🎬 بازپخش",
    strikeReady: "⚡ ضربه آماده است — به سر باس ضربه بزن!",
    bossCores: "🔋 {n}/۳ انرژی — بدن باس خطرناک است",
    bossEat: "🔋 از هستههای انرژی باس (نقاط بنفش) بخور",
    objEat: "{n} سیب", objLength: "طول {n}", objSurvive: "{n}s زنده بمان",
    objTime: "به موقع تمام کن", objNohit: "بدون آسیب",
    objKeys: "{a}/{n} کلید", objBoss: "باس را شکست بده",
    powerupOn: "{icon} {n} فعال شد", eventOn: "{icon} رویداد: {n}",
    bossPhase: "💢 باس وارد فاز {n} شد!", bossDown: "باس شکست خورد! 🎉",
    secretFound: "🗝 اتاق مخفی! +۱۵۰ امتیاز",
    shieldBreak: "سپر شکست!", respawn: "با جان تازه ادامه بده!",
    portalReached: "پرتال فعال شد!",
    endlessRegen: "♾ مرحله {n} بیپایان — سرعت بیشتر!",
    pause: "⏸ توقف", resume: "▶ ادامه", retry: "🔄 دوباره", menu: "🏠 منو",
    achievement: "دستاورد: {n} (+{c} 🪙)",
    worldComplete: "🎉 دنیای «{n}» کامل شد!",
    victory: "پیروزی!", defeat: "باخت!", nextLevel: "➡ مرحله بعد",
    bestEndless: "بهترین بیپایان: {n}", tryAgain: "🔄 تلاش دوباره",
    newWorld: "دنیای جدید", bossBattle: "☠ نبرد باس",
    skinsTitle: "🎨 پوستههای مار", wheelTitle: "🎡 چرخ بخت روزانه",
    wheelCost: "(هر ۲۴ ساعت — یک بار)", spin: "🎡 بچرخان (۵۰ 🪙)",
    frags: "🧩 تکه پوست: {a}/۸ &nbsp;•&nbsp; ⏫ بوستر: {b}",
    chestTitle: "📦 صندوق سکه", chestCost: "(هر ۴ ساعت)",
    openChest: "📦 باز کن (+۱۲۰ 🪙)", prestigeTitle: "🌟 پرستیژ",
    prestigeCost: "(پیشرفتهای فعلی)",
    prestigeBtn: "🌟 پرستیژ: سطح ۱ → سطح {n}",
    free: "رایگان", equip: "مجهز کن", equipped: "✔ مجهز",
    unlockAch: "🔓 با دستاورد", unlockEvent: "🎉 رویداد فصلی",
    unlockPrestige: "🌟 پرستیژ", locked: "🔒 قفل",
    needCoins: "سکه یا جواهر کافی نیست!",
    unlockFirst: "ابتدا شرط را برآورده کن!",
    bought: "پوسته «{n}» خریداری شد!", equippedToast: "پوسته مجهز شد",
    noCoins: "۵۰ سکه کافی نیست!", cooldown: "چرخ بعدی در {n}",
    wheelKicker: "چرخ بخت روزانه",
    wheelBooster: "بوستر «{n}» ذخیره شد — در مرحلهی بعدی خودکار فعال میشود",
    chestNotReady: "صندوق هنوز آماده نیست!",
    chestGot: "🪙 +۱۲۰ سکه از صندوق!",
    prestigeNeed: "برای پرستیژ به سطح ۵ نیاز داری",
    prestigeConfirm: "پرستیژ به سطح {n}؟ (سطوح و ستارهها ریست میشوند اما پوستهها میمانند)",
    prestigeDone: "پرستیژ! 🌟 +۵ جواهر",
    collectionHint: "پوستههای افسانهای 🌟 هیچ مزیت بازی ندارند — فقط ظاهر! روی هر پوسته بزن تا پیشنمایش ببینی.",
    achCount: "{a}/{b} دستاورد",
    lbEmpty: "هنوز رکوردی ثبت نشده — در حالت بیپایان بازی کن!",
    lbEndless: "♾ بیپایان", lbDaily: "🌞 روزانه", lbWeekly: "📅 هفتگی",
    lbMonthly: "🗓 ماهانه", lbAlltime: "🏆 همیشه", recent: "اخیر",
    cloudSoon: "اتصال به لیدربورد جهانی LoveHub بهزودی (Cloud Save).",
    sSfx: "🎵 افکتها", sSfxD: "صدای بازی",
    sMusic: "🎶 موسیقی", sMusicD: "موسیقی تطبیقی دنیاها",
    sMotion: "✨ انیمیشنها", sMotionD: "کاهش انیمیشن برای دستگاههای ضعیف",
    sBattery: "🔋 صرفهجویی باتری", sBatteryD: "کاهش افکتها برای ۶۰fps پایدار",
    sContrast: "🔆 کنتراست بالا", sContrastD: "رنگهای پررنگتر و واضحتر",
    sColorblind: "👁 حالت کوررنگی", sColorblindD: "پالت جایگزین برای موانع",
    sLeft: "✋ چپدست", sLeftD: "جابهجایی دکمههای لمسی",
    sDrag: "🖐 رانندگی با انگشت", sDragD: "مار با حرکت انگشت روی صفحه هدایت میشود (روشن) یا با کشیدن سوایپ (خاموش)",
    sDiff: "🎚 سختی", sDiffD: "سرعت بازی",
    diffEasy: "آسان", diffNormal: "عادی", diffHard: "سخت",
    sFps: "⚡ نرخ فریم", sFpsD: "۶۰ یا ۱۲۰",
    sLang: "🌐 زبان", sLangD: "English / فارسی",
    exportSave: "📤 خروجی ذخیره (کد)", importSave: "📥 ورودی ذخیره (کد)",
    resetAll: "🗑 پاک کردن همه",
    exportToast: "کد ذخیره در کلیپبورد! (در تنظیمات Import کنید)",
    importPrompt: "کد ذخیره را وارد کنید:", invalidCode: "کد نامعتبر است!",
    dailyKicker: "🌞 چالش روزانه",
    dailyWorld: "دنیا: {a} — مرحله {b}", dailyRule: "قانون: {a}",
    dailyReward: "جایزه: 🪙 {a} + 💎 {b}",
    dailyDone: "✔ امروز انجام شد (بهترین: {n})", startChallenge: "🎮 شروع چالش",
    questsTitle: "📋 کوئستهای روزانه", claim: "دریافت {n} 🪙",
    questClaimed: "جایزه کوئست دریافت شد!",
    replayEmpty: "هنوز بازپخشی ثبت نشده — مراحل کمپین را بازی کن!",
    replayBtn: "▶ بازپخش", lvl: "مرحله {n}",
    langPickTitle: "انتخاب زبان", langPickDesc: "Choose Language",
    continueBtn: "ادامه",
    survivalDone: "⏱ زنده ماندی! +۵۰۰", speedOver: "⏱ پایان تندروی",
    treasureGot: "🪙 +۱۵۰", needKey: "نیاز به کلید!", timeUp: "⏳ زمان تمام شد!",
  },
};

export function t(key, vars) {
  const d = D[LANG] || D.fa;
  let s = d[key] !== undefined ? d[key] : (D.fa[key] !== undefined ? D.fa[key] : key);
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
    }
  }
  return s;
}

// ---------- content name helpers ----------
export const SKIN_EN = {
  classic: "Classic", pixel: "Pixel", neon: "Neon", rose: "Rose",
  gold: "Golden Legend", ice: "Ice Crystal", fire: "Fire Serpent",
  shadow: "Shadow Wraith", rainbow: "Rainbow", pumpkin: "Pumpkin",
  snowflake: "Snowflake", candy: "Candy", cyber: "Cyber", space: "Galaxy",
  royal: "Royal", galaxy: "Nebula", dark: "Dark Legend", cosmic: "Cosmic", prism: "Prism",
};
export const PU_EN = {
  speed: "Speed Boost", shield: "Shield", magnet: "Apple Magnet", life: "Extra Life",
  fire: "Fire Snake", freeze: "Freeze Time", slow: "Slow Motion", ghost: "Ghost Mode",
  shock: "Shockwave", frenzy: "Rainbow Frenzy",
};
export const ACH_EN = {
  first_apple: ["First Apple", "Eat your first apple"],
  apple_master: ["Apple Master", "Eat 100 apples"],
  snake_20: ["Snake 20", "Reach length 20"],
  snake_50: ["Snake 50", "Reach length 50"],
  snake_100: ["Snake Legend", "Reach length 100"],
  combo_5: ["Combo 5", "Chain a 5-combo"],
  combo_20: ["Combo King", "Chain a 20-combo"],
  first_win: ["First Victory", "Complete your first level"],
  world1: ["Forest Conqueror", "Complete World 1"],
  world2: ["Ice Conqueror", "Complete World 2"],
  world3: ["Fire Conqueror", "Complete World 3"],
  world4: ["Ocean Conqueror", "Complete World 4"],
  world5: ["Space Conqueror", "Complete World 5"],
  world6: ["Cyber Conqueror", "Complete World 6"],
  world7: ["Shadow Conqueror", "Complete World 7"],
  world8: ["Desert Conqueror", "Complete World 8"],
  world9: ["Dream Conqueror", "Complete World 9"],
  world10: ["Final Conqueror", "Complete World 10"],
  boss_1: ["Boss Hunter", "Defeat your first boss"],
  boss_10: ["Boss Breaker", "Defeat 10 bosses"],
  endless_100: ["Endless 100", "Score 100 in Endless"],
  endless_2000: ["Endless 2000", "Score 2000 in Endless"],
  untouchable: ["Untouchable", "Complete a level without damage"],
  collector: ["Gem Collector", "Collect 50 gems"],
  key_master: ["Key Master", "Collect 5 keys"],
  powerup_25: ["Power 25", "Take 25 power-ups"],
  secret_3: ["Explorer", "Find 3 secret rooms"],
  rich: ["Treasurer", "Earn 10000 coins"],
  streak_3: ["Regular Player", "3-day login streak"],
  streak_7: ["Seven Days", "7-day login streak"],
  prestige_1: ["New Legend", "First prestige"],
  prestige_3: ["Prestige 3", "Reach prestige 3"],
  rainbow_rider: ["Rainbow Rider", "Activate Rainbow 3 times"],
  completionist: ["Completionist", "Collect 100 stars"],
  daily_1: ["Daily Player", "Complete your first daily"],
  golden_apple: ["Golden Apple", "Eat 10 golden apples"],
  wheel_spin: ["Lucky Wheel", "Spin the wheel once"],
};
export const QUEST_EN = {
  play3: "Play 3 levels", eat50: "Eat 50 apples", powerup2: "Take 2 power-ups",
  win1: "Complete 1 level", boss1: "Defeat 1 boss", endless200: "Score 200 in Endless",
};
export const EVENT_EN = { golden: "Golden Apples!", speed: "Speed Surge!", survival: "Survive 30s!", treasure: "Treasure!", frenzy: "Rainbow Frenzy!" };
export const EVENT_FA = { golden: "سیبهای طلایی!", speed: "تندروی!", survival: "۳۰ ثانیه زنده بمان!", treasure: "گنج!", frenzy: "رنگینکمان!" };
export const eventName = (id) => (isFa() ? EVENT_FA[id] : EVENT_EN[id]) || id;
export const RULE_EN = {
  "سرعت دو برابر": "Double speed", "فقط یک جان": "One life only",
  "سیبهای طلایی": "Golden apples", "کمبود پاورآپ": "Few power-ups",
};
export const BOSS_SUB_EN = {
  PashaMar: "Forest Guardian", IceTitan: "Frozen Heart", FireDragon: "Mountain Fury",
  Leviathan: "Deep Sea Monster", Nebula: "Star Devourer", Cyborg: "City AI",
  ShadowKing: "Lord of Darkness", SandWraith: "Desert Fury", DreamEater: "Dream Guardian",
  CosmicEmperor: "Creator of Worlds",
};
export const WORLD_DESC_EN = {
  forest: "The journey begins in the lush forest",
  frozen: "A slippery, frozen land",
  volcano: "Lava rivers and falling rocks",
  ocean: "Water currents and ancient traps",
  space: "Zero gravity and endless dark",
  cyber: "Rotating lasers and moving walls",
  shadow: "The Shadow King's lair",
  desert: "Sandstorms and forgotten forts",
  dream: "Dreamy colors and magic doors",
  final: "The final battle for the crown",
};

export const skinName = (s) => (isFa() ? s.fa : SKIN_EN[s.id] || s.fa);
export const puName = (p) => (isFa() ? p.fa : PU_EN[p.id] || p.fa);
export const achName = (a) => (isFa() ? a.fa : (ACH_EN[a.id] && ACH_EN[a.id][0]) || a.fa);
export const achDesc = (a) => (isFa() ? a.desc : (ACH_EN[a.id] && ACH_EN[a.id][1]) || a.desc);
export const worldName = (w) => (isFa() ? w.fa : w.en || w.fa);
export const worldDesc = (w) => (isFa() ? w.desc : WORLD_DESC_EN[w.id] || w.desc);
export const bossSub = (b) => (isFa() ? b.sub : BOSS_SUB_EN[b.name] || b.sub);
export const questName = (q) => (isFa() ? q.fa : QUEST_EN[q.id] || q.fa);
export const ruleName = (r) => (isFa() ? r.fa : RULE_EN[r.fa] || r.fa);
