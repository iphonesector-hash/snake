// LoveHub Snake — boss battle engine.
export class Boss {
  constructor(def, level, game) {
    this.def = def;
    this.game = game;
    const a = def.arena;
    const len = 5 + def.phases;
    this.body = [];
    for (let i = 0; i < len; i++) this.body.push({ x: a.x - i, y: a.y });
    this.hp = def.hp;
    this.maxHp = def.maxHp;
    this.phase = 0;
    this.moveCd = 0.55;
    this.attackCd = 3.2;
    this.coreCd = 7;
    this.cores = 0; // energy cores eaten by snake
    this.strikeReady = false;
    this.invuln = 0;
    this.flash = 0;
    this.enraged = false;
    this.state = "enter"; // enter -> fight -> dying
    this.t = 0;
    this.roared = false;
  }

  get head() { return this.body[0]; }
  get tail() { return this.body[this.body.length - 1]; }
  get weakSegs() { return this.body.slice(this.body.length - 2); }

  damage(n) {
    if (this.invuln > 0 || this.state !== "fight") return false;
    this.hp -= n;
    this.flash = 0.25;
    this.invuln = 1.2;
    const g = this.game;
    g.fx.burst(this.head.x, this.head.y, this.def.c, { count: 30, speed: 4, life: 0.7, glow: true });
    g.fx.ring(this.head.x, this.head.y, this.def.c, 10);
    g.shake(10);
    g.audio.play("boom");
    g.audio.play("bossRoar");
    const frac = this.hp / this.maxHp;
    if (frac <= (this.phase + 1) / this.def.phases && this.phase < this.def.phases - 1) {
      this.phase++;
      this.enraged = true;
      this.invuln = 2;
      g.onEvent("bossPhase", { phase: this.phase });
      g.fx.confetti(this.head.x, this.head.y, [this.def.c, "#fff"]);
    }
    if (this.hp <= 0) {
      this.state = "dying";
      g.onEvent("bossDefeated", {});
      if (g.level) g.level.objectives.forEach((o) => { if (o.type === "boss") o.current = 1; });
      g.complete();
    }
    return true;
  }

  spawnCore() {
    const g = this.game;
    const { level } = g;
    let guard = 0;
    while (guard++ < 80) {
      const x = 1 + Math.floor(Math.random() * (level.cols - 2));
      const y = 1 + Math.floor(Math.random() * (level.rows - 2));
      if (g.blocked(x, y)) continue;
      if (g.ents.foods.some((f) => f.x === x && f.y === y)) continue;
      g.ents.foods.push({ x, y, px: x, py: y, kind: "core" });
      g.onEvent("coreSpawned", { x, y });
      return;
    }
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);
    if (this.state === "enter") {
      if (this.t > 1.6) this.state = "fight";
      return;
    }
    if (this.state === "dying") return;

    const speedMul = this.enraged ? 0.35 : 1 + this.phase * 0.25;
    this.moveCd -= dt;
    if (this.moveCd <= 0) {
      this.moveCd = (0.5 - this.phase * 0.05) * (this.enraged ? 0.5 : 1);
      this.step(speedMul);
    }

    this.attackCd -= dt;
    if (this.attackCd <= 0) {
      this.attackCd = Math.max(1.8, 3.4 - this.phase * 0.5);
      if (Math.random() < 0.5) this.shoot();
      else this.summonMines();
      if (this.enraged) { this.enraged = false; this.dash(); }
    }

    this.coreCd -= dt;
    if (this.coreCd <= 0) {
      this.coreCd = 6.5 - this.phase;
      if (g.ents.foods.filter((f) => f.kind === "core").length < 2) this.spawnCore();
    }
  }

  step(mul) {
    const g = this.game;
    const h = g.head;
    const bx = this.head.x, by = this.head.y;
    const dx = Math.sign(Math.round(h.x) - bx), dy = Math.sign(Math.round(h.y) - by);
    const options = [];
    if (dx !== 0 && !g.blocked(bx + dx, by)) options.push([dx, 0]);
    if (dy !== 0 && !g.blocked(bx, by + dy)) options.push([0, dy]);
    if (options.length === 0) {
      if (!g.blocked(bx + 1, by)) options.push([1, 0]);
      if (!g.blocked(bx - 1, by)) options.push([-1, 0]);
      if (!g.blocked(bx, by + 1)) options.push([0, 1]);
      if (!g.blocked(bx, by - 1)) options.push([0, -1]);
    }
    if (options.length === 0) return;
    const [mx, my] = options[Math.floor(Math.random() * options.length)];
    // body follow
    for (let i = this.body.length - 1; i > 0; i--) {
      this.body[i].x = this.body[i - 1].x;
      this.body[i].y = this.body[i - 1].y;
    }
    this.body[0].x = bx + mx;
    this.body[0].y = by + my;
    void mul;
  }

  shoot() {
    const g = this.game;
    const bx = this.head.x, by = this.head.y;
    const hx = Math.round(g.head.x), hy = Math.round(g.head.y);
    const dx = Math.sign(hx - bx), dy = Math.sign(hy - by);
    const dirs = [[dx || 1, dy || 0], [dx || -1, dy || 0], [dx || 0, dy || 1], [dx || 0, dy || -1]];
    const used = new Set();
    let fired = 0;
    for (const [vx, vy] of dirs) {
      const k = vx + "," + vy;
      if (used.has(k)) continue;
      used.add(k);
      g.ents.projectiles.push({
        x: bx + vx * 0.5, y: by + vy * 0.5, vx: vx * 4.5, vy: vy * 4.5,
        life: 6, color: this.def.c, fromBoss: true,
      });
      fired++;
      if (fired >= 2 + this.phase) break;
    }
    g.audio.play("shoot");
    g.fx.ring(bx, by, this.def.c, 6, 0.3);
  }

  summonMines() {
    const g = this.game;
    const hx = Math.round(g.head.x), hy = Math.round(g.head.y);
    for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const x = hx + ox, y = hy + oy;
      if (g.blocked(x, y)) continue;
      g.ents.mines.push({ x, y, px: x, py: y, armed: false, fuseT: 0 });
    }
    g.audio.play("tick");
  }

  dash() {
    const g = this.game;
    // sudden multi-step lunge toward the snake
    for (let s = 0; s < 2; s++) this.step(2);
    g.shake(6);
    g.audio.play("bossRoar");
    g.fx.ring(this.head.x, this.head.y, this.def.c, 12, 0.4);
  }

  onCoreEaten() {
    this.cores++;
    this.game.audio.play("gold");
    if (this.cores >= 3) {
      this.cores = 0;
      this.strikeReady = true;
      this.game.onEvent("strikeReady", {});
    }
  }
}
