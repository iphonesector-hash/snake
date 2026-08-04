// LoveHub Snake — core game engine.
import { WORLDS, POWERUPS } from "../core/content.js";
import { AudioSys } from "../core/audio.js";
import { Particles, Floaters } from "./particles.js";
import { Boss } from "./boss.js";
import {
  spawnEntities, updateEnemies, updateMwalls, updateLasers, updateMines,
  updateProjectiles, wallOccupancy,
} from "./entities.js";

export class Game {
  constructor({ onEvent }) {
    this.onEvent = onEvent; // (type, data) => void
    this.fx = new Particles();
    this.floaters = new Floaters();
    this.audio = AudioSys;
    this.mode = "campaign";
    this.level = null;
    this.world = WORLDS[0];
    this.running = false;
    this.paused = false;
    this.over = false;
    this.time = 0;
    this.dt = 0;
    this.timeScale = 1;
    this.slowmo = 0;
    this.shakeAmt = 0;
    this.flashT = 0;
    this.combo = 0;
    this.comboT = 0;
    this.bestCombo = 0;
    this.score = 0;
    this.dead = false;
    this.frenzyCount = 0;
    this.windCell = null;
    this.apples = 0;
    this.goldenApples = 0;
    this.dir = { x: 0, y: 1 };
    this.queue = [];
    this.segments = [];
    this.grow = 0;
    this.stepTimer = 0;
    this.stepCount = 0;
    this.slip = false;
    this.lastTele = "";
    this.invulnT = 0;
    this.lives = 0;
    this.hits = 0;
    this.foodsEaten = 0;
    this.gemsCollected = 0;
    this.keysCollected = 0;
    this.secElapsed = 0;
    this.powerups = {};
    this.ents = null;
    this.boss = null;
    this.mwallOcc = new Set();
    this.inputLog = [];
    this.replayMode = false;
    this.replayStep = 0;
    this.replayLog = [];
    this.secretFound = false;
    this.weatherT = 0;
    this.eventCd = 0;          // seconds until next random event
    this.eventName = null;     // currently active event label
    this.eventSpeed = 0;       // seconds of speed-surge event remaining
    this.eventSurvival = 0;    // seconds left in survival event
    this.eventSurvivalMax = 0;
    this.treasureEarned = 0;
  }

  startLevel(level, mode = "campaign", opts = {}) {
    this.mode = mode;
    this.level = level;
    this.world = WORLDS[level.worldIdx] || WORLDS[0];
    this.ents = spawnEntities(level);
    this.mwallOcc = wallOccupancy(this.ents.mwalls);
    this.boss = level.boss ? new Boss(level.boss, level, this) : null;
    const sx = Math.floor(level.cols / 2), sy = level.rows - 3;
    this.segments = [];
    for (let i = 0; i < 3; i++) {
      this.segments.push({ x: sx, y: sy + i, px: sx, py: sy + i + 1 });
    }
    this.dir = { x: 0, y: -1 };
    this.queue = [];
    this.grow = 0;
    this.stepTimer = 0;
    this.stepCount = 0;
    this.time = 0;
    this.secElapsed = 0;
    this.score = 0;
    this.combo = 0; this.comboT = 0; this.bestCombo = 0;
    this.apples = 0; this.goldenApples = 0;
    this.powerupsTaken = 0;
    this.foodsEaten = 0; this.gemsCollected = 0; this.keysCollected = 0;
    this.hits = 0; this.lives = 0; this.invulnT = 0;
    this.slip = false; this.lastTele = "";
    this.powerups = {};
    this.inputLog = [];
    this.replayMode = !!opts.replay;
    this.replayLog = opts.replay ? opts.replay.log : [];
    this.replayStep = 0;
    this.secretFound = false;
    this.portalReached = false;
    this.endlessRegenT = 30;
    this.eventCd = 0;
    this.eventName = null;
    this.eventSpeed = 0;
    this.eventSurvival = 0;
    this.eventSurvivalMax = 0;
    this.treasureEarned = 0;
    if (this.deathTimer) { clearTimeout(this.deathTimer); this.deathTimer = null; }
    this.shakeAmt = 0; this.flashT = 0; this.slowmo = 0;
    this.over = false; this.paused = false; this.running = true;
    this.difficulty = 1;
    this.fx.list.length = 0;
    this.floaters.list.length = 0;
    this.audio.startMusic(this.world.music);
    this.audio.setIntensity(0);
    this.onEvent("levelStart", { level, mode });
  }

  // ---------- input ----------
  queueDir(dx, dy) {
    if (this.over || this.paused || this.replayMode) return false;
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (last.x === dx && last.y === dy) return false;
    if (last.x === -dx && last.y === -dy) return false;
    if (this.queue.length < 3) { this.queue.push({ x: dx, y: dy }); return true; }
    return false;
  }

  inputDir(dx, dy) {
    const changed = this.queueDir(dx, dy);
    if (changed && this.stepCount > 2) this.audio.play("swish");
    if (!this.replayMode) this.inputLog.push({ s: this.stepCount, dx, dy });
  }

  togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    if (this.paused) this.audio.stopMusic();
    else this.audio.startMusic(this.world.music, Math.min(3, Math.floor(this.combo / 5)));
    this.onEvent("pause", { paused: this.paused });
  }

  blocked(x, y) {
    const l = this.level;
    if (x < 0 || y < 0 || x >= l.cols || y >= l.rows) return true;
    const k = x + "," + y;
    if (l.static.some((c) => c.x === x && c.y === y)) return true;
    if (this.mwallOcc.has(k)) return true;
    if (this.ents.mines.some((m) => m.x === x && m.y === y)) return true;
    if (this.ents.enemies.some((e) => e.x === x && e.y === y)) return true;
    if (this.boss && this.boss.body.some((b) => b.x === x && b.y === y)) return true;
    return false;
  }

  speedMul() {
    let m = this.difficulty || 1;
    if (this.powerups.speed) m *= 1.55;
    if (this.eventSpeed > 0) m *= 1.5; // speed-surge event
    if (this.world.weather === "snow") m *= 0.95;
    return m;
  }

  step() {
    this.stepCount++;
    // apply queued direction (ice slide ignores input for one step)
    if (this.slip) {
      this.slip = false;
      this.queue.length = 0;
    } else if (this.queue.length) {
      const d = this.queue.shift();
      if (!(this.dir.x === -d.x && this.dir.y === -d.y)) this.dir = d;
    }
    const head = this.segments[0];
    let nx = head.x + this.dir.x, ny = head.y + this.dir.y;
    const ghost = !!this.powerups.ghost;
    const fire = !!this.powerups.fire;

    // ice slip: moving onto ice forces one more step in the same direction
    const onIce = this.ents.staticCells.ice.some((c) => c.x === nx && c.y === ny);
    if (onIce && !this.slip) this.slip = true;

    // hazards & collisions (skip when ghost/fire)
    const haz = this.hazardAt(nx, ny);
    if (haz && !ghost && !fire) {
      if (haz === "enemy" && this.powerups.fire) { this.killEnemyAt(nx, ny); }
      else if (haz === "mine") { this.explodeAt(nx, ny); }
      else { this.hitSnake(haz); return; }
    }
    if (this.blocked(nx, ny) && !ghost && !fire) {
      // self collision
      const self = this.segments.some((s) => s.x === nx && s.y === ny);
      this.hitSnake(self ? "self" : "wall");
      return;
    }

    // teleport
    const tp = this.ents.teleporters.find((t) => t.x === nx && t.y === ny);
    if (tp && this.lastTele !== tp.x + "," + tp.y) {
      this.lastTele = tp.x + "," + tp.y;
      nx = tp.tx; ny = tp.ty;
      this.fx.burst(tp.x, tp.y, "#22d3ee", { count: 16, speed: 3, glow: true });
      this.fx.burst(nx, ny, "#22d3ee", { count: 16, speed: 3, glow: true });
      this.audio.play("portal");
    }

    // move snake
    for (let i = this.segments.length - 1; i > 0; i--) {
      this.segments[i].px = this.segments[i].x;
      this.segments[i].py = this.segments[i].y;
      this.segments[i].x = this.segments[i - 1].x;
      this.segments[i].y = this.segments[i - 1].y;
    }
    head.px = head.x; head.py = head.y;
    head.x = nx; head.y = ny;
    if (this.grow > 0) {
      const tail = this.segments[this.segments.length - 1];
      this.segments.push({ x: tail.x, y: tail.y, px: tail.x, py: tail.y });
      this.grow--;
    }

    // wind push
    const wind = this.ents.staticCells.wind.find((c) => c.x === nx && c.y === ny);
    if (wind && !this.blocked(nx + wind.dx, ny + wind.dy)) {
      // push body along (simple: nudge head once via extra step next tick)
      this.windCell = wind;
    } else this.windCell = null;

    // boss collision check
    if (this.boss && this.boss.state === "fight") {
      const bHead = this.boss.head;
      if (bHead.x === nx && bHead.y === ny) {
        if (this.boss.strikeReady) {
          this.boss.strikeReady = false;
          this.boss.damage(1);
          this.addScore(200);
          this.floaters.add(nx, ny - 1, "+200", "#fde047", 18);
        } else if (!ghost) this.hitSnake("boss");
      } else if (this.boss.body.some((b) => b.x === nx && b.y === ny) && !ghost) {
        this.hitSnake("boss");
      }
    }

    this.collect(nx, ny);
    this.checkObjectives();
  }

  collect(nx, ny) {
    const ents = this.ents;
    // food
    const fi = ents.foods.findIndex((f) => f.x === nx && f.y === ny);
    if (fi >= 0) {
      const f = ents.foods[fi];
      ents.foods.splice(fi, 1);
      if (f.kind === "treasure") {
        // treasure event drop: instant coin reward
        this.treasureEarned++;
        this.addScore(150);
        this.hitStop(0.12);
        this.shake(8);
        this.floaters.add(nx, ny - 0.6, "🪙 +۱۵۰", "#fde047", 16);
        this.fx.burst(nx, ny, "#fde047", { count: 18, speed: 3, life: 0.7, glow: true });
        this.audio.play("reward");
        return;
      }
      if (f.kind === "core") {
        if (this.boss) this.boss.onCoreEaten();
        this.floaters.add(nx, ny - 0.6, "🔋", "#c4b5fd", 16);
      } else {
        this.combo = Math.min(this.combo + 1, 99);
        this.comboT = 3;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.apples++;
        const frenzy = !!this.powerups.frenzy;
        const gold = f.kind === "gold";
        if (gold) { this.goldenApples++; this.hitStop(0.1); this.shake(6); }
        const base = gold ? 30 : 10;
        const pts = Math.round(base * (1 + this.combo * 0.1) * (frenzy ? 2 : 1));
        this.addScore(pts);
        this.fx.burst(nx, ny, gold ? "#fde047" : "#f87171", { count: 10, speed: 2.5, life: 0.5, glow: true });
        this.audio.play(gold ? "gold" : "eat", this.combo);
        // combo milestone fanfare
        if (this.combo > 1 && this.combo % 5 === 0) {
          this.audio.play("combo", this.combo);
          this.floaters.add(nx, ny - 0.7, `COMBO ×${this.combo}`, "#fde047", 15);
          this.fx.ring(nx, ny, "#fde047", 9, 0.4);
        }
        if (!frenzy && Math.random() < 0.14 && !this.boss) this.spawnPowerup(nx, ny);
      }
      return;
    }
    // gem
    const gi = ents.gems.findIndex((g) => g.x === nx && g.y === ny);
    if (gi >= 0) {
      ents.gems.splice(gi, 1);
      this.gemsCollected++;
      this.addScore(50);
      this.fx.burst(nx, ny, "#22d3ee", { count: 14, speed: 2.8, life: 0.6, glow: true });
      this.fx.ring(nx, ny, "#22d3ee", 7, 0.35);
      this.audio.play("gem");
      return;
    }
    // key
    const ki = ents.keys.findIndex((k) => k.x === nx && k.y === ny);
    if (ki >= 0) {
      ents.keys.splice(ki, 1);
      this.keysCollected++;
      this.addScore(30);
      this.floaters.add(nx, ny - 0.6, "🔑", "#fde047", 18);
      this.audio.play("key");
      this.fx.burst(nx, ny, "#fde047", { count: 12, speed: 2, glow: true });
      return;
    }
    // power-up
    const pi = ents.powerups.findIndex((p) => p.x === nx && p.y === ny);
    if (pi >= 0) {
      const p = ents.powerups[pi];
      ents.powerups.splice(pi, 1);
      this.applyPowerup(p.type);
      return;
    }
    // portal
    if (ents.portal && ents.portal.x === nx && ents.portal.y === ny) {
      const needKeys = this.level.keys.length > 0;
      if (needKeys && this.keysCollected < this.level.keys.length) {
        this.floaters.add(nx, ny - 0.6, "نیاز به کلید!", "#fb923c", 14);
        return;
      }
      this.audio.play("portal");
      this.portalReached = true;
      this.onEvent("portalReached", {});
      this.checkObjectives();
      return;
    }
    // secret
    if (ents.secret && !ents.secret.found && ents.secret.x === nx && ents.secret.y === ny) {
      ents.secret.found = true;
      this.secretFound = true;
      this.addScore(150);
      this.audio.play("secret");
      this.fx.confetti(nx, ny, null, 40);
      this.onEvent("secretFound", {});
    }
  }

  spawnPowerup(x, y) {
    const types = Object.keys(POWERUPS);
    const type = types[Math.floor(Math.random() * types.length)];
    this.ents.powerups.push({ x, y, px: x, py: y, type, taken: false });
  }

  addScore(n) {
    this.score += n;
    this.onEvent("score", { score: this.score });
  }

  // ---------- power-ups ----------
  applyPowerup(type) {
    const g = this;
    const def = POWERUPS[type];
    g.powerupsTaken++;
    this.audio.play(type === "shield" ? "shield" : "power");
    this.addScore(20);
    if (type === "life") { this.lives++; this.floaters.add(g.head.x, g.head.y - 0.8, "❤️ +1", "#f87171", 18); }
    else if (type === "shock") {
      const hx = Math.round(g.head.x), hy = Math.round(g.head.y);
      g.fx.ring(hx, hy, "#fbbf24", 14, 0.5);
      g.fx.burst(hx, hy, "#fbbf24", { count: 40, speed: 5, life: 0.7, glow: true });
      g.shake(12);
      g.audio.play("shock");
      for (let i = g.ents.enemies.length - 1; i >= 0; i--) {
        const e = g.ents.enemies[i];
        if (Math.abs(e.x - hx) <= 3 && Math.abs(e.y - hy) <= 3) {
          g.fx.burst(e.x, e.y, "#fbbf24", { count: 12, speed: 3, life: 0.5 });
          g.ents.enemies.splice(i, 1);
        }
      }
      for (const m of [...g.ents.mines]) {
        g.fx.burst(m.x, m.y, "#fbbf24", { count: 10, speed: 2.5, life: 0.5 });
      }
      g.ents.mines.length = 0;
      g.ents.projectiles.length = 0;
    }
    else if (type === "frenzy") {
      g.frenzyCount++;
      g.powerups.frenzy = { t: def.dur };
      g.fx.confetti(g.head.x, g.head.y, null, 40);
    }
    else {
      this.powerups[type] = { t: def.dur || 0 };
    }
    this.floaters.add(this.head.x, this.head.y - 0.8, `${def.icon} ${def.fa}`, def.color, 16);
    this.onEvent("powerup", { type });
  }

  updatePowerupTimers() {
    for (const k of Object.keys(this.powerups)) {
      const p = this.powerups[k];
      if (p.t > 0) {
        p.t -= this.dt;
        if (p.t <= 0) {
          delete this.powerups[k];
          this.floaters.add(this.head.x, this.head.y - 0.8, POWERUPS[k].icon, POWERUPS[k].color, 12);
        }
      } else if (p.t <= 0) delete this.powerups[k];
    }
  }

  // magnet attraction on each step
  magnetPull() {
    if (!this.powerups.magnet) return;
    const hx = this.head.x, hy = this.head.y;
    for (const f of this.ents.foods) {
      const d = Math.abs(f.x - hx) + Math.abs(f.y - hy);
      if (d <= 3 && d > 0) {
        const dx = Math.sign(hx - f.x), dy = Math.sign(hy - f.y);
        if (dx !== 0 && !this.blocked(f.x + dx, f.y)) { f.px = f.x; f.py = f.y; f.x += dx; }
        else if (dy !== 0 && !this.blocked(f.x, f.y + dy)) { f.px = f.x; f.py = f.y; f.y += dy; }
      }
    }
  }

  // ---------- damage & death ----------
  killEnemyAt(x, y) {
    const i = this.ents.enemies.findIndex((e) => e.x === x && e.y === y);
    if (i >= 0) {
      this.ents.enemies.splice(i, 1);
      this.addScore(25);
      this.fx.burst(x, y, "#fb923c", { count: 14, speed: 3, glow: true });
    }
  }

  explodeAt(x, y) {
    this.fx.burst(x, y, "#fbbf24", { count: 26, speed: 4.5, life: 0.6, glow: true });
    this.fx.ring(x, y, "#fbbf24", 12, 0.45);
    this.shake(10);
    this.audio.play("boom");
    for (let i = this.ents.enemies.length - 1; i >= 0; i--) {
      const e = this.ents.enemies[i];
      if (Math.abs(e.x - x) <= 2 && Math.abs(e.y - y) <= 2) this.ents.enemies.splice(i, 1);
    }
    const hx = Math.round(this.head.x), hy = Math.round(this.head.y);
    if (Math.abs(hx - x) <= 1.5 && Math.abs(hy - y) <= 1.5) this.hitSnake("mine");
  }

  hitSnake(source) {
    if (this.over || this.invulnT > 0) return;
    if (this.powerups.shield) {
      this.hits++;
      delete this.powerups.shield;
      this.invulnT = 0.8;
      this.fx.ring(this.head.x, this.head.y, "#60a5fa", 12, 0.5);
      this.audio.play("hurt");
      this.shake(8);
      this.onEvent("shieldBreak", {});
      return;
    }
    if (this.lives > 0) {
      this.lives--;
      this.invulnT = 2;
      this.fx.burst(this.head.x, this.head.y, "#f87171", { count: 20, speed: 3, glow: true });
      this.audio.play("hurt");
      // respawn at spawn point
      const sx = Math.floor(this.level.cols / 2), sy = this.level.rows - 3;
      this.segments = [];
      for (let i = 0; i < 3; i++) this.segments.push({ x: sx, y: sy + i, px: sx, py: sy + i + 1 });
      this.dir = { x: 0, y: -1 };
      this.queue = [];
      this.onEvent("respawn", {});
      return;
    }
    this.die(source);
  }

  die(source) {
    if (this.over) return;
    this.hits++;
    this.dead = true;
    this.slowmo = 0.9;
    this.timeScale = 0.25;
    this.audio.play("die");
    this.audio.stopMusic();
    this.fx.burst(this.head.x, this.head.y, this.world.c1, { count: 50, speed: 5, life: 1, glow: true });
    this.shake(16);
    this.onEvent("death", { source });
    this.deathTimer = setTimeout(() => { this.gameOver(); }, 1100);
  }

  gameOver() {
    if (this.over) return;
    this.over = true;
    this.running = false;
    this.onEvent("gameOver", { score: this.score, win: false });
  }

  complete() {
    if (this.over) return;
    this.over = true;
    this.running = false;
    this.audio.stopMusic();
    this.audio.play("win");
    this.slowmo = 0.5;
    this.onEvent("complete", {});
  }

  // ---------- objectives ----------
  objectiveDone(o) {
    const l = this.level;
    switch (o.type) {
      case "eat": return this.apples >= o.target;
      case "length": return this.segments.length >= o.target;
      case "survive": return this.secElapsed >= o.seconds;
      case "time": return this.portalReached; // reach portal before timer ends
      case "nohit": return this.hits === 0 && this.stepCount >= 12 && !this.powerups.shield;
      case "keys": return this.keysCollected >= o.target;
      case "boss": return !this.boss || this.boss.hp <= 0;
      default: return true;
    }
  }

  checkObjectives() {
    if (this.over || !this.level) return;
    if (this.mode === "endless" || this.mode === "replay") return;
    const all = this.level.objectives.every((o) => this.objectiveDone(o));
    if (all) this.complete();
  }

  // ---------- hazard lookup ----------
  hazardAt(x, y) {
    const ents = this.ents;
    const k = x + "," + y;
    if (ents.staticCells.lava.some((c) => c.x === x && c.y === y)) return "lava";
    if (ents.staticCells.spikes.some((c) => c.x === x && c.y === y)) return "spikes";
    if (ents.staticCells.poison.some((c) => c.x === x && c.y === y)) return "poison";
    if (this.mwallOcc.has(k)) return "wall";
    for (const m of ents.mines) if (m.x === x && m.y === y) return "mine";
    for (const l of ents.lasers) {
      if (!l.active) continue;
      for (let i = 0; i < l.len; i++) {
        if (l.axis === "x" && l.x + i === x && l.y === y) return "laser";
        if (l.axis === "y" && l.y + i === y && l.x === x) return "laser";
      }
    }
    for (const e of ents.enemies) if (e.x === x && e.y === y) return "enemy";
    return null;
  }

  shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); }

  // brief slow-motion hit-stop for juicy feedback
  hitStop(t) {
    if (this.slowmo > t) return;
    this.slowmo = t;
    this.timeScale = 0.3;
  }

  get head() { return this.segments[0]; }
  get length() { return this.segments.length; }

  // ---------- main update ----------
  update(dt) {
    if (!this.running || this.paused || this.over) return;
    this.dt = dt;
    const scale = this.timeScale;
    this.time += dt;
    this.weatherT += dt;
    this.secElapsed += dt;
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      if (this.slowmo <= 0) this.timeScale = 1;
    }
    this.shakeAmt *= 0.9;
    this.flashT = Math.max(0, this.flashT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.updatePowerupTimers();
    this.fx.update(dt);
    this.floaters.update(dt);

    // combo decay
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }

    // freeze affects entities
    const frozen = !!this.powerups.freeze;
    const slow = !!this.powerups.slow;
    const eff = frozen ? 0 : slow ? 0.45 : 1;

    // obstacles & entities
    if (!frozen) {
      updateLasers(this.ents.lasers, this);
      updateEnemies(this.ents.enemies, this);
      updateMwalls(this.ents.mwalls, this);
      this.mwallOcc = wallOccupancy(this.ents.mwalls);
      updateMines(this.ents.mines, this);
      updateProjectiles(this.ents.projectiles, this);
    } else {
      this.ents.mines.forEach((m) => { m.fuseT = Math.min(m.fuseT, 0.4); });
    }
    void eff;

    // boss
    if (this.boss) {
      if (frozen) this.boss.invuln = Math.max(this.boss.invuln, this.boss.invuln);
      else this.boss.update(dt);
      if (this.boss.hp <= 0 && this.boss.state !== "dying") {
        this.boss.state = "dying";
        this.level.objectives.forEach((o) => { if (o.type === "boss") o.current = 1; });
        this.complete();
      }
    }

    // time limit
    if (this.level.timeLimit > 0 && !this.over) {
      this.level.timeLimit -= dt;
      if (this.level.timeLimit <= 0) { this.level.timeLimit = 0; this.die("time"); }
    }

    // survival objective check on timer
    this.checkObjectives();

    // ---------- dynamic events ----------
    if (this.eventSurvival > 0) {
      this.eventSurvival -= dt;
      if (this.eventSurvival <= 0) {
        this.eventSurvival = 0;
        this.eventName = null;
        this.addScore(500);
        this.fx.confetti(this.head.x, this.head.y, null, 40);
        this.audio.play("reward");
        this.floaters.add(this.head.x, this.head.y - 0.8, "⏱ زنده ماندی! +۵۰۰", "#fde047", 16);
      }
    }
    if (this.eventSpeed > 0) {
      this.eventSpeed -= dt;
      if (this.eventSpeed <= 0) {
        this.eventSpeed = 0;
        this.floaters.add(this.head.x, this.head.y - 0.8, "⏱ پایان تندروی", "#94a3b8", 12);
      }
    }
    // schedule the next random event (no events on boss levels / timed objectives / replays)
    if (!this.boss && !this.level.timeLimit && this.mode !== "replay") {
      this.eventCd -= dt;
      if (this.eventCd <= 0) {
        this.eventCd = 22 + Math.random() * 16; // 22-38s cadence
        this.triggerEvent();
      }
    }

    // music intensity
    const intensity = Math.min(3, Math.floor(this.combo / 5) + (this.boss ? 2 : 0));
    this.audio.setIntensity(intensity);

    // endless mode: regenerate level every 30s with rising difficulty
    if (this.mode === "endless" && !this.over) {
      this.endlessRegenT -= dt;
      if (this.endlessRegenT <= 0) {
        this.endlessRegenT = 30;
        this.onEvent("endlessRegen");
      }
    }

    // movement stepping
    this.stepTimer += dt * this.speedMul() * scale;
    while (this.stepTimer >= 1) {
      this.stepTimer -= 1;
      if (this.over) break;
      this.magnetPull();
      this.step();
      // wind push follow-through
      if (this.windCell) {
        const w = this.windCell;
        this.windCell = null;
        const h = this.segments[0];
        const txn = h.x + w.dx, tyn = h.y + w.dy;
        if (!this.blocked(txn, tyn) && this.hazardAt(txn, tyn) === null && !this.segments.some((s) => s.x === txn && s.y === tyn)) {
          for (let i = this.segments.length - 1; i > 0; i--) {
            this.segments[i].px = this.segments[i].x; this.segments[i].py = this.segments[i].y;
            this.segments[i].x = this.segments[i - 1].x; this.segments[i].y = this.segments[i - 1].y;
          }
          h.px = h.x; h.py = h.y; h.x = txn; h.y = tyn;
        }
      }
    }
    if (this.over) return;

    // smooth interpolation progress
    this.moveProgress = this.stepTimer;

    // replay driving
    if (this.replayMode) {
      while (this.replayStep < this.replayLog.length && this.replayLog[this.replayStep].s <= this.stepCount) {
        const e = this.replayLog[this.replayStep++];
        const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
        if (!(last.x === -e.dx && last.y === -e.dy) && !(last.x === e.dx && last.y === e.dy)) {
          this.queue.push({ x: e.dx, y: e.dy });
        }
      }
    }
  }

  // ---------- random run events ----------
  triggerEvent() {
    const pool = ["golden", "speed", "survival", "treasure", "frenzy"];
    const ev = pool[Math.floor(Math.random() * pool.length)];
    const l = this.level;
    const freeCell = () => {
      for (let i = 0; i < 60; i++) {
        const x = 1 + Math.floor(Math.random() * (l.cols - 2));
        const y = 1 + Math.floor(Math.random() * (l.rows - 2));
        if (!this.blocked(x, y) && !this.hazardAt(x, y) && !this.segments.some((s) => s.x === x && s.y === y)) return { x, y };
      }
      return null;
    };
    const faMap = { golden: "سیبهای طلایی!", speed: "تندروی!", survival: "۳۰ ثانیه زنده بمان!", treasure: "گنج!", frenzy: "رنگینکمان!" };
    const iconMap = { golden: "✨", speed: "⚡", survival: "⏱", treasure: "🪙", frenzy: "🌈" };
    switch (ev) {
      case "golden": {
        for (let i = 0; i < 4; i++) {
          const c = freeCell();
          if (c) this.ents.foods.push({ x: c.x, y: c.y, kind: "gold" });
        }
        break;
      }
      case "speed": this.eventSpeed = 8; break;
      case "survival": this.eventSurvival = this.eventSurvivalMax = 30; break;
      case "treasure": {
        const c = freeCell();
        if (c) this.ents.foods.push({ x: c.x, y: c.y, kind: "treasure" });
        break;
      }
      case "frenzy":
        this.frenzyCount++;
        this.powerups.frenzy = { t: 6 };
        this.fx.confetti(this.head.x, this.head.y, null, 40);
        break;
    }
    this.eventName = ev;
    this.audio.play("event");
    this.floaters.add(this.head.x, this.head.y - 0.8, `${iconMap[ev]} ${faMap[ev]}`, "#fde047", 15);
    this.onEvent("event", { id: ev, fa: faMap[ev], icon: iconMap[ev] });
  }

  // weather overlay parameters for renderer
  weatherSpec() {
    const w = this.world.weather;
    const specs = {
      leaves: { kind: "leaves", color: "#86efac", n: 26, vy: 0.8, sway: 1 },
      snow: { kind: "snow", color: "#ffffff", n: 40, vy: 0.4, sway: 1 },
      embers: { kind: "embers", color: "#fb923c", n: 22, vy: -0.5, sway: 0.5 },
      rain: { kind: "rain", color: "#93c5fd", n: 70, vy: 3.5, sway: 0 },
      neonrain: { kind: "rain", color: "#67e8f9", n: 70, vy: 3.5, sway: 0 },
      meteors: { kind: "meteors", color: "#fbbf24", n: 8, vy: 2.5, sway: 0 },
      fog: { kind: "fog", color: "#c4b5fd", n: 0, vy: 0, sway: 0 },
      sandstorm: { kind: "sand", color: "#fcd34d", n: 60, vy: 1.6, sway: 2 },
      aurora: { kind: "aurora", color: "#a5f3fc", n: 0, vy: 0, sway: 0 },
      golden: { kind: "golden", color: "#fde047", n: 20, vy: 0.6, sway: 1 },
    };
    return specs[w] || specs.leaves;
  }
}

