// LoveHub Snake — canvas renderer.
import { POWERUPS, skinById } from "../core/content.js";

const PU_COLORS = Object.fromEntries(Object.entries(POWERUPS).map(([k, v]) => [k, v.color]));
const PU_ICONS = Object.fromEntries(Object.entries(POWERUPS).map(([k, v]) => [k, v.icon]));

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.boardX = 0; this.boardY = 0; this.cell = 24;
    this.weatherPts = [];
    this.battery = false;
    this.contrast = false;
    this.colorblind = false;
  }

  setSettings(s) {
    this.battery = !!s.battery;
    this.contrast = !!s.contrast;
    this.colorblind = !!s.colorblind;
    this.weatherPts = [];
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.round(w * this.dpr));
    this.canvas.height = Math.max(1, Math.round(h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  layout() {
    const l = this.game.level;
    if (!l) return;
    const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    this.cell = Math.max(12, Math.floor(Math.min((cw - 20) / l.cols, (ch - 20) / l.rows)));
    this.boardW = this.cell * l.cols;
    this.boardH = this.cell * l.rows;
    this.boardX = (cw - this.boardW) / 2;
    this.boardY = (ch - this.boardH) / 2;
  }

  px(x) { return this.boardX + x * this.cell; }
  py(y) { return this.boardY + y * this.cell; }

  // ----- weather particle seeding -----
  ensureWeather(spec) {
    if (this.weatherPts.length >= spec.n) return;
    const l = this.game.level;
    for (let i = this.weatherPts.length; i < spec.n; i++) {
      this.weatherPts.push({
        x: Math.random() * this.boardW, y: Math.random() * this.boardH,
        v: 0.5 + Math.random() * spec.vy * 0.5, d: Math.random() * 100,
        s: 1 + Math.random() * 2,
      });
    }
  }

  drawWeather(spec, t) {
    const { ctx } = this;
    const q = this.battery ? 0.5 : 1;
    if (spec.kind === "fog") {
      const g = ctx.createLinearGradient(0, 0, 0, this.boardH);
      g.addColorStop(0, "rgba(148,163,184,0)");
      g.addColorStop(0.5, "rgba(148,163,184,0.22)");
      g.addColorStop(1, "rgba(148,163,184,0)");
      ctx.fillStyle = g;
      ctx.fillRect(this.boardX, this.boardY, this.boardW, this.boardH);
      return;
    }
    if (spec.kind === "aurora") {
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.12 + i * 0.03;
        const y0 = this.boardY + this.boardH * (0.15 + i * 0.18);
        ctx.beginPath();
        for (let x = 0; x <= this.boardW; x += 20) {
          const y = y0 + Math.sin(x / 90 + t * 0.4 + i * 2) * 24 + Math.sin(x / 30 + t * 0.9) * 8;
          x === 0 ? ctx.moveTo(this.boardX + x, y) : ctx.lineTo(this.boardX + x, y);
        }
        ctx.strokeStyle = i === 1 ? "#4ade80" : i === 2 ? "#a78bfa" : "#22d3ee";
        ctx.lineWidth = 26;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }
    const count = Math.round(spec.n * q);
    ctx.save();
    ctx.lineWidth = spec.kind === "rain" ? 1.5 : 1;
    ctx.fillStyle = spec.color;
    ctx.strokeStyle = spec.color;
    for (let i = 0; i < count; i++) {
      const p = this.weatherPts[i] || (this.weatherPts[i] = { x: Math.random() * this.boardW, y: Math.random() * this.boardH, v: 1, d: Math.random() * 100, s: 1.5 });
      p.y += p.v * q * (spec.kind === "meteors" ? 6 : 1.2);
      p.x += Math.sin(t * 2 + p.d) * 0.4 * (spec.sway || 0) + (spec.kind === "meteors" ? 3 : 0);
      if (p.y > this.boardH + 20) { p.y = -10; p.x = Math.random() * this.boardW; }
      if (p.x > this.boardW + 20) p.x = -10;
      const px = this.boardX + p.x, py = this.boardY + p.y;
      if (spec.kind === "rain" || spec.kind === "meteors" || spec.kind === "sand") {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - (spec.kind === "sand" ? 6 : 3), py - (spec.kind === "sand" ? 6 : 9));
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.6 + Math.sin(t * 3 + p.d) * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, p.s * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ----- main draw -----
  draw() {
    const g = this.game;
    const { ctx } = this;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!g.level) return;
    this.layout();

    // shake offset
    const sx = (Math.random() - 0.5) * g.shakeAmt;
    const sy = (Math.random() - 0.5) * g.shakeAmt;

    ctx.save();
    ctx.translate(sx, sy);
    this.drawBackground();
    this.drawBoard();
    this.drawEntities();
    if (g.boss) this.drawBoss();
    this.drawSnake();
    this.drawWeatherOverlay();
    ctx.restore();

    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);

    // flash
    if (g.flashT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${g.flashT * 1.4})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawBackground() {
    const { ctx } = this;
    const world = this.game.world;
    const g = ctx.createLinearGradient(0, this.boardY, 0, this.boardY + this.boardH);
    g.addColorStop(0, world.bg[0]);
    g.addColorStop(1, world.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    // ambient glow blobs
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = world.c1;
    const t = this.game.time;
    for (let i = 0; i < 3; i++) {
      const bx = this.boardX + this.boardW * (0.2 + i * 0.3) + Math.sin(t * 0.4 + i * 2) * 30;
      const by = this.boardY + this.boardH * (0.3 + (i % 2) * 0.4);
      ctx.beginPath();
      ctx.arc(bx, by, 90 + i * 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawBoard() {
    const { ctx } = this;
    const l = this.game.level;
    const world = this.game.world;
    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= l.cols; x++) {
      ctx.beginPath(); ctx.moveTo(this.px(x), this.boardY); ctx.lineTo(this.px(x), this.boardY + this.boardH); ctx.stroke();
    }
    for (let y = 0; y <= l.rows; y++) {
      ctx.beginPath(); ctx.moveTo(this.boardX, this.py(y)); ctx.lineTo(this.boardX + this.boardW, this.py(y)); ctx.stroke();
    }
    // static walls
    for (const c of l.static) this.cellRect(c.x, c.y, "rgba(255,255,255,0.14)", "rgba(0,0,0,0.25)");
    // ice
    for (const c of l.ice) {
      ctx.fillStyle = "rgba(165,243,252,0.16)";
      ctx.fillRect(this.px(c.x) + 2, this.py(c.y) + 2, this.cell - 4, this.cell - 4);
      ctx.strokeStyle = "rgba(224,242,254,0.35)";
      ctx.strokeRect(this.px(c.x) + 2, this.py(c.y) + 2, this.cell - 4, this.cell - 4);
    }
    // lava / poison
    const t = this.game.time;
    for (const c of [...l.lava, ...l.poison]) {
      const lava = c.kind !== "poison";
      const col = this.colorblind ? (lava ? "#e5e7eb" : "#a78bfa") : lava ? "#f97316" : "#c084fc";
      const wave = Math.sin(t * 3 + c.x * 2 + c.y * 3) * 0.25 + 0.5;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.35 + wave * 0.25;
      ctx.fillRect(this.px(c.x), this.py(c.y), this.cell, this.cell);
      ctx.globalAlpha = 1;
    }
    // spikes
    for (const c of l.spikes) {
      ctx.fillStyle = this.contrast ? "#f8fafc" : "#94a3b8";
      for (let i = 0; i < 3; i++) {
        const x0 = this.px(c.x) + 2 + i * (this.cell - 4) / 3;
        ctx.beginPath();
        ctx.moveTo(x0, this.py(c.y) + this.cell - 2);
        ctx.lineTo(x0 + (this.cell - 4) / 6, this.py(c.y) + 2);
        ctx.lineTo(x0 + (this.cell - 4) / 3, this.py(c.y) + this.cell - 2);
        ctx.fill();
      }
    }
    // wind
    for (const c of l.wind) {
      ctx.fillStyle = "rgba(125,211,252,0.5)";
      ctx.font = `${Math.floor(this.cell * 0.55)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(c.dx > 0 ? "➡️" : "⬅️", this.px(c.x) + this.cell / 2, this.py(c.y) + this.cell / 2);
    }
  }

  cellRect(x, y, fill, stroke) {
    const { ctx } = this;
    ctx.fillStyle = fill;
    ctx.fillRect(this.px(x) + 1, this.py(y) + 1, this.cell - 2, this.cell - 2);
    if (stroke) { ctx.strokeStyle = stroke; ctx.strokeRect(this.px(x) + 1, this.py(y) + 1, this.cell - 2, this.cell - 2); }
  }

  drawEntities() {
    const g = this.game;
    const { ctx } = this;
    const t = g.time;
    const e = g.ents;

    // teleporters
    for (const tp of e.teleporters) {
      const pulse = 0.5 + Math.sin(t * 4) * 0.3;
      ctx.fillStyle = `rgba(34,211,238,${0.25 + pulse * 0.2})`;
      ctx.beginPath();
      ctx.arc(this.px(tp.x) + this.cell / 2, this.py(tp.y) + this.cell / 2, this.cell * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#67e8f9";
      ctx.stroke();
      ctx.font = `${Math.floor(this.cell * 0.4)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🌀", this.px(tp.x) + this.cell / 2, this.py(tp.y) + this.cell / 2);
    }
    // lasers
    for (const l of e.lasers) {
      ctx.fillStyle = "#f472b6";
      ctx.beginPath(); ctx.arc(this.px(l.x) + this.cell / 2, this.py(l.y) + this.cell / 2, 4, 0, Math.PI * 2); ctx.fill();
      if (l.active) {
        const len = l.len;
        const x0 = this.px(l.x) + this.cell / 2, y0 = this.py(l.y) + this.cell / 2;
        const x1 = l.axis === "x" ? x0 + len * this.cell : x0;
        const y1 = l.axis === "y" ? y0 + len * this.cell : y0;
        const grad = ctx.createLinearGradient(x0, y0, x1, y1);
        grad.addColorStop(0, "rgba(244,114,182,0.05)");
        grad.addColorStop(0.5, "rgba(244,114,182,0.5)");
        grad.addColorStop(1, "rgba(244,114,182,0.05)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.cell * 0.5;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = "#fdf2f8";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    // mines
    for (const m of e.mines) {
      const blink = m.armed && m.blink;
      ctx.fillStyle = blink ? "#fff" : this.colorblind ? "#9ca3af" : "#1f2937";
      ctx.beginPath(); ctx.arc(this.px(m.x) + this.cell / 2, this.py(m.y) + this.cell / 2, this.cell * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.font = "10px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("✳", this.px(m.x) + this.cell / 2, this.py(m.y) + this.cell / 2);
    }
    // moving walls
    for (const mw of e.mwalls) {
      const f = this.lerpF();
      for (let i = 0; i < mw.len; i++) {
        const cx = mw.axis === "x" ? mw.x + i : mw.x;
        const cy = mw.axis === "y" ? mw.y + i : mw.y;
        this.cellRect(cx, cy, "rgba(251,146,60,0.55)", "rgba(0,0,0,0.3)");
      }
      void f;
    }
    // enemies
    for (const en of e.enemies) {
      const f = this.lerpF();
      const x = this.px(en.px + (en.x - en.px) * f) + this.cell / 2;
      const y = this.py(en.py + (en.y - en.py) * f) + this.cell / 2;
      ctx.fillStyle = this.contrast ? "#f8fafc" : en.c;
      ctx.shadowColor = en.c; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, this.cell * 0.33, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#000";
      ctx.fillRect(x - 3, y - 1, 2.5, 2.5); ctx.fillRect(x + 1.5, y - 1, 2.5, 2.5);
    }
    // keys
    for (const k of e.keys) {
      ctx.font = `${Math.floor(this.cell * 0.5)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.75 + Math.sin(t * 3) * 0.25;
      ctx.fillText("🔑", this.px(k.x) + this.cell / 2, this.py(k.y) + this.cell / 2);
      ctx.globalAlpha = 1;
    }
    // portal
    if (e.portal) {
      const pulse = 0.5 + Math.sin(t * 5) * 0.3;
      const r = this.cell * (0.42 + pulse * 0.08);
      const grad = ctx.createRadialGradient(this.px(e.portal.x) + this.cell / 2, this.py(e.portal.y) + this.cell / 2, 2, this.px(e.portal.x) + this.cell / 2, this.py(e.portal.y) + this.cell / 2, r);
      grad.addColorStop(0, "#a78bfa"); grad.addColorStop(1, "rgba(167,139,250,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(this.px(e.portal.x) + this.cell / 2, this.py(e.portal.y) + this.cell / 2, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ddd6fe"; ctx.stroke();
      ctx.font = `${Math.floor(this.cell * 0.45)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🚪", this.px(e.portal.x) + this.cell / 2, this.py(e.portal.y) + this.cell / 2);
    }
    // secret
    if (e.secret && !e.secret.found) {
      const pulse = 0.5 + Math.sin(t * 2) * 0.3;
      ctx.font = `${Math.floor(this.cell * 0.45)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.4 + pulse * 0.4;
      ctx.fillText("❓", this.px(e.secret.x) + this.cell / 2, this.py(e.secret.y) + this.cell / 2);
      ctx.globalAlpha = 1;
    }
    // gems
    for (const gem of e.gems) {
      const f = this.lerpF();
      const x = this.px(gem.px + (gem.x - gem.px) * f) + this.cell / 2;
      const y = this.py(gem.py + (gem.y - gem.py) * f) + this.cell / 2;
      const s = 0.7 + Math.sin(t * 4 + gem.x) * 0.15;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -this.cell * 0.32); ctx.lineTo(this.cell * 0.24, 0); ctx.lineTo(0, this.cell * 0.32); ctx.lineTo(-this.cell * 0.24, 0);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath(); ctx.arc(-this.cell * 0.07, -this.cell * 0.1, this.cell * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // foods
    for (const f of e.foods) {
      const x = this.px(f.x) + this.cell / 2;
      const y = this.py(f.y) + this.cell / 2 + Math.sin(t * 3 + f.x) * 1.5;
      if (f.kind === "core") {
        ctx.fillStyle = "#c4b5fd"; ctx.shadowColor = "#c4b5fd"; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(x, y, this.cell * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
        ctx.font = "10px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⚡", x, y);
      } else {
        const gold = f.kind === "gold";
        const col = gold ? "#fde047" : "#ef4444";
        ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x - this.cell * 0.1, y, this.cell * 0.16, 0, Math.PI * 2); ctx.arc(x + this.cell * 0.1, y, this.cell * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#7f1d1d";
        ctx.fillRect(x - this.cell * 0.04, y - this.cell * 0.26, this.cell * 0.08, this.cell * 0.14);
        ctx.shadowBlur = 0;
      }
    }
    // powerups
    for (const p of e.powerups) {
      const pulse = 0.5 + Math.sin(t * 4 + p.x) * 0.3;
      const col = PU_COLORS[p.type] || "#fde047";
      ctx.globalAlpha = 0.35 + pulse * 0.3;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(this.px(p.x) + this.cell / 2, this.py(p.y) + this.cell / 2, this.cell * 0.38, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = `${Math.floor(this.cell * 0.42)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(PU_ICONS[p.type] || "❓", this.px(p.x) + this.cell / 2, this.py(p.y) + this.cell / 2);
    }
    // projectiles
    for (const pr of e.projectiles) {
      ctx.fillStyle = pr.color; ctx.shadowColor = pr.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(this.px(pr.x) + this.cell / 2, this.py(pr.y) + this.cell / 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // particles & floaters (drawn in board space)
    g.fx.draw(ctx);
    g.floaters.draw(ctx);
  }

  drawBoss() {
    const g = this.game;
    const { ctx } = this;
    const b = g.boss;
    if (!b || b.state === "dying") return;
    const t = g.time;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const seg = this.cell * 0.72;
    for (let i = b.body.length - 1; i >= 0; i--) {
      const s = b.body[i];
      const x = this.px(s.x) + this.cell / 2, y = this.py(s.y) + this.cell / 2;
      const weak = b.weakSegs.includes(s);
      const col = weak && !b.strikeReady ? "#4ade80" : weak && b.strikeReady ? "#fde047" : b.def.c;
      ctx.fillStyle = col;
      ctx.shadowColor = col; ctx.shadowBlur = b.flash > 0 ? 30 : 16;
      const r = seg * (i === 0 ? 0.55 : 0.44) * (1 - i / b.body.length * 0.35);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // head details
    const h = b.head;
    const hx = this.px(h.x) + this.cell / 2, hy = this.py(h.y) + this.cell / 2;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(hx - 4, hy - 3, 2.5, 0, Math.PI * 2); ctx.arc(hx + 4, hy - 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(hx - 4, hy - 3, 1.2, 0, Math.PI * 2); ctx.arc(hx + 4, hy - 3, 1.2, 0, Math.PI * 2); ctx.fill();
    if (b.invuln > 0 && Math.sin(t * 20) > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, this.cell * 0.8, 0, Math.PI * 2); ctx.stroke();
    }
    if (b.strikeReady) {
      ctx.fillStyle = "rgba(253,224,71,0.25)";
      ctx.beginPath(); ctx.arc(hx, hy, this.cell * 1.1 + Math.sin(t * 8) * 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fde047"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, this.cell * 0.95, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  lerpF() {
    const sp = this.game.stepTimer;
    return sp * sp * (3 - 2 * sp); // smoothstep: 0=at new cell
  }

  drawSnake() {
    const g = this.game;
    const { ctx } = this;
    const skin = skinById(g.skinId) || skinById("classic");
    const cols = skin.colors;
    const f = this.lerpF();
    const invuln = g.invulnT > 0 && Math.sin(g.time * 24) > 0;
    const ghost = !!g.powerups.ghost;
    const fire = !!g.powerups.fire;
    const shield = !!g.powerups.shield;

    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalAlpha = ghost ? 0.55 : invuln ? 0.4 : 1;

    const n = g.segments.length;
    // trail glow
    const trail = skin.trail;
    if (trail && !this.battery) {
      ctx.strokeStyle = trail === "neon" ? "#22d3ee" : trail === "gold" ? "#fde047" : trail === "ice" ? "#a5f3fc" : trail === "fire" ? "#fb923c" : trail === "shadow" ? "#a78bfa" : trail === "rainbow" ? `hsl(${(g.time * 200) % 360},90%,65%)` : cols[0];
      ctx.globalAlpha *= 0.35;
      ctx.lineWidth = this.cell * 0.62;
      ctx.beginPath();
      g.segments.forEach((s, i) => {
        const x = this.px(s.px + (s.x - s.px) * f) + this.cell / 2;
        const y = this.py(s.py + (s.y - s.py) * f) + this.cell / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalAlpha = ghost ? 0.55 : invuln ? 0.4 : 1;
    }
    // body
    for (let i = n - 1; i >= 0; i--) {
      const s = g.segments[i];
      const x = this.px(s.px + (s.x - s.px) * f) + this.cell / 2;
      const y = this.py(s.py + (s.y - s.py) * f) + this.cell / 2;
      const k = i / Math.max(1, n - 1);
      const r = this.cell * 0.42 * (1 - k * 0.28);
      const c = i % 2 === 0 ? cols[0] : cols[1];
      ctx.fillStyle = c;
      if (this.battery) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      else {
        ctx.shadowColor = cols[0]; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.55, 0, Math.PI * 2); ctx.fill();
      }
    }
    // head
    const h = g.head;
    const hx = this.px(h.px + (h.x - h.px) * f) + this.cell / 2;
    const hy = this.py(h.py + (h.y - h.py) * f) + this.cell / 2;
    const hr = this.cell * 0.48;
    ctx.fillStyle = cols[0];
    ctx.shadowColor = cols[0]; ctx.shadowBlur = fire ? 20 : 12;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // eyes
    const dx = g.dir.x, dy = g.dir.y;
    const pxx = -dy, pyy = dx; // perpendicular
    const ex = hx + dx * hr * 0.35, ey = hy + dy * hr * 0.35;
    const eyeStyle = skin.eyes;
    if (eyeStyle === "square") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(ex + pxx * hr * 0.35 - 2.5, ey + pyy * hr * 0.35 - 2.5, 5, 5);
      ctx.fillRect(ex - pxx * hr * 0.35 - 2.5, ey - pyy * hr * 0.35 - 2.5, 5, 5);
      ctx.fillStyle = "#000";
      ctx.fillRect(ex + pxx * hr * 0.35 - 1.2, ey + pyy * hr * 0.35 - 1.2, 2.4, 2.4);
      ctx.fillRect(ex - pxx * hr * 0.35 - 1.2, ey - pyy * hr * 0.35 - 1.2, 2.4, 2.4);
    } else if (eyeStyle === "star" || eyeStyle === "glow") {
      ctx.fillStyle = eyeStyle === "star" ? "#fde047" : "#fff";
      ctx.shadowColor = eyeStyle === "star" ? "#fde047" : "#22d3ee"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(ex + pxx * hr * 0.35, ey + pyy * hr * 0.35, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - pxx * hr * 0.35, ey - pyy * hr * 0.35, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex + pxx * hr * 0.35, ey + pyy * hr * 0.35, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - pxx * hr * 0.35, ey - pyy * hr * 0.35, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(ex + pxx * hr * 0.35 + dx * 1.2, ey + pyy * hr * 0.35 + dy * 1.2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - pxx * hr * 0.35 + dx * 1.2, ey - pyy * hr * 0.35 + dy * 1.2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // powerup auras
    if (fire) {
      ctx.fillStyle = "rgba(251,146,60,0.35)";
      ctx.beginPath(); ctx.arc(hx, hy, hr + 6, 0, Math.PI * 2); ctx.fill();
      ctx.font = "14px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🔥", hx - dx * hr, hy - dy * hr);
    }
    if (shield) {
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(hx, hy, hr + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  drawWeatherOverlay() {
    const g = this.game;
    if (g.level.darkness || g.level.fog) {
      const hx = this.px(g.head.x) + this.cell / 2;
      const hy = this.py(g.head.y) + this.cell / 2;
      const r = this.cell * (g.level.fog ? 7 : 5);
      const grad = this.ctx.createRadialGradient(hx, hy, r * 0.2, hx, hy, r);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, this.colorblind ? "rgba(15,23,42,0.96)" : "rgba(0,0,0,0.94)");
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(this.boardX - 10, this.boardY - 10, this.boardW + 20, this.boardH + 20);
    }
    const spec = g.weatherSpec();
    this.ensureWeather(spec);
    if (spec.n > 0) this.drawWeather(spec, g.weatherT);
  }
}
