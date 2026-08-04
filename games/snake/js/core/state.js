// LoveHub Snake — persistent player profile + localStorage state.
import { ACHIEVEMENTS, totalStars, newDailyQuests } from "./content.js";

const SAVE_KEY = "lovehub.snake.v1";

const DEFAULTS = () => ({
  coins: 150,
  gems: 0,
  keys: 0,
  xp: 0,
  level: 1,
  prestige: 0,
  owned: ["classic"],
  skin: "classic",
  achievements: [],
  stars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // completed levels per world
  starsPl: new Array(100).fill(0),          // best stars per level (1-3)
  best: { endless: 0, daily: 0, weekly: 0, monthly: 0, alltime: 0, country: 0 },
  leaderboard: [], // {t, mode, score, len, date}
  stats: { apples: 0, maxLength: 0, bestCombo: 0, levelsWon: 0, bosses: 0, gems: 0, keys: 0, powerups: 0, secrets: 0, coinsEarned: 0, nohits: 0, dailies: 0, goldenApples: 0, wheelSpins: 0, frenzies: 0, plays: 0, endlessScore: 0 },
  login: { last: "", streak: 0, total: 0, claimed: null },
  daily: { done: "", best: 0 },
  quests: [],
  questDate: "",
  runs: [], // replay logs (capped)
  settings: { sfx: true, music: true, motion: true, contrast: false, colorblind: false, leftHanded: false, difficulty: 1, battery: false, fps: 60 },
});

let PROFILE = null;

export function loadProfile() {
  if (PROFILE) return PROFILE;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
  PROFILE = { ...DEFAULTS(), ...saved };
  PROFILE.stats = { ...DEFAULTS().stats, ...(saved.stats || {}) };
  PROFILE.best = { ...DEFAULTS().best, ...(saved.best || {}) };
  PROFILE.settings = { ...DEFAULTS().settings, ...(saved.settings || {}) };
  PROFILE.starsPl = (saved.starsPl && saved.starsPl.length === 100) ? saved.starsPl : new Array(100).fill(0);
  } catch {
    PROFILE = DEFAULTS();
  }
  return PROFILE;
}

export function saveProfile() {
  if (!PROFILE) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(PROFILE)); } catch { /* storage full */ }
}

export const profile = () => PROFILE || loadProfile();

// ---------- economy ----------
export function xpForLevel(lv) { return 60 + lv * 40; }

export function grant(coins = 0, gems = 0, keys = 0, xp = 0) {
  const p = profile();
  p.coins += coins;
  p.gems += gems;
  p.keys += keys;
  p.xp += xp;
  if (coins > 0) p.stats.coinsEarned += coins;
  const levels = [];
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.coins += 50 + p.level * 10;
    levels.push(p.level);
  }
  saveProfile();
  return levels;
}

export function spend(coins = 0, gems = 0) {
  const p = profile();
  if (p.coins < coins || p.gems < gems) return false;
  p.coins -= coins; p.gems -= gems;
  saveProfile();
  return true;
}

export function prestige() {
  const p = profile();
  p.prestige++;
  p.level = 1; p.xp = 0;
  p.coins = 500; p.gems = p.gems + 5;
  p.stars = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  p.stats = DEFAULTS().stats;
  saveProfile();
}

// ---------- achievements ----------
export function checkAchievements(ctx) {
  const p = profile();
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (p.achievements.includes(a.id)) continue;
    try {
      if (a.check(p, ctx)) {
        p.achievements.push(a.id);
        grant(a.reward || 0, a.rewardGems || 0, 0, 30);
        newly.push(a);
      }
    } catch { /* ignore */ }
  }
  if (newly.length) saveProfile();
  return newly;
}

// ---------- level stars / rewards ----------
export function recordLevel(worldIdx, levelNum, stars, run) {
  const p = profile();
  const idx = (worldIdx * 10 + levelNum - 1);
  p.starsPl[idx] = Math.max(p.starsPl[idx] || 0, stars);
  p.stars[worldIdx] = Math.max(p.stars[worldIdx] || 0, levelNum <= 10 ? levelNum : 0);
  if (run && run.mode !== "endless") {
    p.runs.unshift(run);
    if (p.runs.length > 20) p.runs.length = 20;
  }
  const isBoss = levelNum === 10;
  p.stats.levelsWon++;
  if (isBoss) p.stats.bosses++;
  if (run && run.nohit) p.stats.nohits++;
  const rewards = { coins: 40 + levelNum * 8 + stars * 15, gems: isBoss ? 2 : 0, xp: 20 + levelNum * 6 };
  grant(rewards.coins, rewards.gems, 0, rewards.xp);
  saveProfile();
  return rewards;
}

export function recordEndless(score) {
  const p = profile();
  p.stats.endlessScore = Math.max(p.stats.endlessScore, score);
  if (score > p.best.endless) {
    p.best.endless = score;
    const t = Date.now();
    p.best.weekly = score > p.best.weekly ? score : p.best.weekly;
    p.best.monthly = score > p.best.monthly ? score : p.best.monthly;
    p.best.alltime = score > p.best.alltime ? score : p.best.alltime;
    p.leaderboard.push({ t, mode: "endless", score, len: 0, date: new Date().toISOString().slice(0, 10) });
    if (p.leaderboard.length > 200) p.leaderboard = p.leaderboard.slice(-200);
  }
  if (score > 0) grant(Math.min(Math.floor(score / 10), 200), 0, 0, Math.floor(score / 8));
  saveProfile();
}

export function recordDaily(score, rewards) {
  const p = profile();
  p.stats.dailies++;
  p.daily.done = todayKey();
  if (score > p.daily.best) p.daily.best = score;
  grant(rewards.coins || 0, rewards.gems || 0, 0, 40);
  saveProfile();
}

export function addQuestProgress(stat, n = 1) {
  const p = profile();
  const today = todayKey();
  if (p.questDate !== today) {
    p.quests = newDailyQuests();
    p.questDate = today;
  }
  for (const q of p.quests) {
    if (q.done) continue;
    if (stat === q.stat || (q.stat === "endlessScore" && stat === "endlessScore")) {
      q.prog = Math.min(q.prog + n, q.target);
      if (q.prog >= q.target) q.done = true;
    }
  }
  saveProfile();
}

export function claimQuest(i) {
  const p = profile();
  const q = p.quests[i];
  if (!q || !q.done || q.claimed) return false;
  q.claimed = true;
  grant(q.reward, 0, 0, 20);
  saveProfile();
  return true;
}

export function dailyLogin() {
  const p = profile();
  const today = todayKey();
  if (p.login.last === today) return { claimed: true, streak: p.login.streak };
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  p.login.streak = p.login.last === yesterday ? p.login.streak + 1 : 1;
  p.login.last = today;
  p.login.total++;
  const reward = Math.min(p.login.streak, 7) * 25 + (p.login.streak % 7 === 0 ? 10 : 0);
  grant(reward, p.login.streak % 7 === 0 ? 1 : 0, 0, 30);
  saveProfile();
  return { claimed: false, streak: p.login.streak, reward };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function unlockSkin(id) {
  const p = profile();
  if (p.owned.includes(id)) return true;
  p.owned.push(id);
  saveProfile();
  return true;
}

export function equipSkin(id) {
  const p = profile();
  if (!p.owned.includes(id)) return false;
  p.skin = id;
  saveProfile();
  return true;
}

export function wheelSpin() {
  const p = profile();
  if (p.coins < 50) return null;
  p.coins -= 50;
  const roll = Math.random();
  let res;
  if (roll < 0.45) res = { kind: "coins", n: 100 };
  else if (roll < 0.7) res = { kind: "coins", n: 200 };
  else if (roll < 0.85) res = { kind: "gems", n: 2 };
  else if (roll < 0.94) res = { kind: "coins", n: 500 };
  else res = { kind: "gems", n: 5 };
  p.stats.wheelSpins++;
  if (res.kind === "coins") grant(res.n, 0, 0, 0);
  else grant(0, res.n, 0, 0);
  saveProfile();
  return res;
}

export function chestOpen(kind) {
  const p = profile();
  if (kind === "coins") {
    const now = Date.now();
    if (p.login.claimed && now - p.login.claimed < 4 * 3600000) return null;
    p.login.claimed = now;
    grant(120, 0, 0, 20);
    saveProfile();
    return { kind: "coins", n: 120 };
  }
  return null;
}
