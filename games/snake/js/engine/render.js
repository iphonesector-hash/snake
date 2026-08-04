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
    this.camX = 0; this.camY = 0; // camera follow offset (px)
    this.zoom = 1; this.zoomCur = 1; // dynamic zoom (out as the snake grows)
    this.bgStars = [];
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
    // fill the entire screen (iPhone / Android full-bleed)
    const pad = Math.min(cw, ch) * 0.015;
    this.cell = Math.max(11, Math.floor(Math.min((cw - pad * 2) / l.cols, (ch - pad * 2) / l.rows)));
    this.boardW = this.cell * l.cols;
    this.boardH = this.cell * l.rows;
    this.boardX = Math.max(pad, (cw - this.boardW) / 2);
    this.boardY = Math.max(pad, (ch - this.boardH) / 2);
    if (!this.bgStars.length) this.seedStars(cw, ch);
  }

  seedStars(w, h) {
    this.bgStars = [];
    const n = this.battery ? 24 : 48;
    for (let i = 0; i < n; i++) {
      this.bgStars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.5 + Math.random() * 1.6, layer: Math.random() < 0.4 ? 0.5 : 1,
        tw: Math.random() * 6.28, sp: 0.5 + Math.random() * 1.4,
      });
    }
  }

  // camera follow: lead toward the snake head + look ahead in travel direction
  updateCamera(dt) {
    const g = this.game;
    if (!g.level) return;
    const hx = this.px(g.head.x) + this.cell / 2;
    const hy = this.py(g.head.y) + this.cell / 2;
    const cx = this.canvas.clientWidth / 2, cy = this.canvas.clientHeight / 2;
    // subtle lead so the player sees more of where the snake is heading
    const lead = this.cell * (1.4 + Math.min(1.6, g.length * 0.04));
    const tx = (hx - cx) * 0.09 + g.dir.x * lead;
    const ty = (hy - cy) * 0.09 + g.dir.y * lead;
    const k = Math.min(1, dt * 6);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    // dynamic zoom: pull out as the snake grows so the whole body stays in view
    const len = g.length || 3;
    this.zoom = Math.max(0.86, Math.min(1, 1 - (len - 8) * 0.004));
    this.zoomCur += (this.zoom - this.zoomCur) * Math.min(1, dt * 2.2);
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
    this.updateCamera(0.016);

    // screen-space backdrop (always covers the whole canvas)
    this.drawBackground();
    this.drawParallax();

    // world-space layers, drifted by camera + shake, scaled by dynamic zoom
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.zoomCur, this.zoomCur);
    ctx.translate(-w / 2, -h / 2);
    ctx.translate(-this.camX + sx, -this.camY + sy);
    this.drawBoard();
    this.drawEntities();
    if (g.boss) this.drawBoss();
    this.drawSnake();
    this.drawWeatherOverlay();
    ctx.restore();

    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.35)");
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
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, world.bg[0]);
    g.addColorStop(1, world.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // ambient glow blobs (full-bleed, drifting)
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = world.c1;
    const t = this.game.time;
    for (let i = 0; i < 4; i++) {
      const bx = w * (0.15 + i * 0.25) + Math.sin(t * 0.3 + i * 2.1) * w * 0.04;
      const by = h * (0.2 + (i % 2) * 0.4) + Math.cos(t * 0.24 + i * 1.7) * h * 0.05;
      ctx.beginPath();
      ctx.arc(bx, by, 90 + i * 46, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // depth parallax layer: stars / dust drifting behind the world
  drawParallax() {
    const { ctx } = this;
    const t = this.game.time;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.battery) return;
    ctx.save();
    for (const s of this.bgStars) {
      const drift = Math.sin(t * s.sp + s.tw) * 8;
      const px = ((s.x + this.camX * 0.4 + drift) % w + w) % w;
      const py = ((s.y + this.camY * 0.4 + t * 6 * s.layer) % h + h) % h;
      ctx.globalAlpha = 0.18 + Math.sin(t * 2 + s.tw) * 0.12 * s.layer;
      ctx.fillStyle = s.layer > 0.7 ? "#ffffff" : "#93c5fd";
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawBoard() {
    const { ctx } = this;
    const l = this.game.level;
    const world = this.game.world;
    // de-boxed grid: barely-there dots instead of a hard board grid
    ctx.strokeStyle = "rgba(255,255,255,0.028)";
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
      } else if (f.kind === "treasure") {
        const bob = 0.5 + Math.sin(t * 5 + f.x) * 0.2;
        ctx.shadowColor = "#fde047"; ctx.shadowBlur = 14;
        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.moveTo(x - this.cell * 0.22, y + this.cell * 0.12);
        ctx.lineTo(x + this.cell * 0.22, y + this.cell * 0.12);
        ctx.lineTo(x + this.cell * 0.14, y - this.cell * 0.26);
        ctx.lineTo(x - this.cell * 0.14, y - this.cell * 0.26);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fde047";
        ctx.font = `${Math.floor(this.cell * 0.3)}px system-ui`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.globalAlpha = bob;
        ctx.fillText("💎", x, y - this.cell * 0.04);
        ctx.globalAlpha = 1;
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

  // ---------- premium snake ----------
  skinPoints(g, f) {
    return g.segments.map((s) => ({
      x: this.px(s.px + (s.x - s.px) * f) + this.cell / 2,
      y: this.py(s.py + (s.y - s.py) * f) + this.cell / 2,
    }));
  }

  // tapered polyline: width shrinks from the head toward the tail for an organic body
  strokeBodyTaper(pts, wHead, wTail, style) {
    const { ctx } = this;
    ctx.strokeStyle = style;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (pts.length === 1) {
      ctx.lineWidth = wHead;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[0].x + 0.01, pts[0].y); ctx.stroke();
      return;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const k = i / (pts.length - 1);
      ctx.lineWidth = wHead + (wTail - wHead) * k;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }
  }

  drawSnake() {
    const g = this.game;
    const { ctx } = this;
    const skin = skinById(g.skinId) || skinById("classic");
    const f = this.lerpF();
    const invuln = g.invulnT > 0 && Math.sin(g.time * 24) > 0;
    const ghost = !!g.powerups.ghost;
    const fire = !!g.powerups.fire;
    const shield = !!g.powerups.shield;
    const pts = this.skinPoints(g, f);
    if (!pts.length) return;

    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalAlpha = ghost ? 0.55 : invuln ? 0.4 : 1;

    const n = pts.length;
    const glow = this.battery ? 0 : skin.glow || 8;

    // ---------- body ----------
    // soft drop shadow for depth
    const shPts = pts.map((p) => ({ x: p.x + this.cell * 0.08, y: p.y + this.cell * 0.12 }));
    ctx.globalAlpha *= 0.7;
    this.strokeBodyTaper(shPts, this.cell * 0.48, this.cell * 0.2, "rgba(0,0,0,0.32)");
    ctx.globalAlpha = ghost ? 0.55 : invuln ? 0.4 : 1;
    // outer glow pass
    if (glow > 0) {
      ctx.shadowColor = skin.colors[0];
      ctx.shadowBlur = glow;
      this.strokeBodyTaper(pts, this.cell * 0.5, this.cell * 0.22, skin.colors[0]);
      ctx.shadowBlur = 0;
    }
    // main body: gradient polyline, tapered head→tail
    const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y);
    grad.addColorStop(0, skin.colors[0]);
    grad.addColorStop(1, skin.colors[1]);
    this.strokeBodyTaper(pts, this.cell * 0.46, this.cell * 0.2, grad);
    // lighting: bright specular band on the top-left edge
    const hiPts = pts.map((p) => ({ x: p.x - this.cell * 0.05, y: p.y - this.cell * 0.05 }));
    ctx.globalAlpha *= 0.5;
    this.strokeBodyTaper(hiPts, this.cell * 0.17, this.cell * 0.05, "rgba(255,255,255,0.42)");
    // lighting: darker shading band on the bottom-right edge
    this.strokeBodyTaper(shPts, this.cell * 0.34, this.cell * 0.12, "rgba(0,0,0,0.22)");
    ctx.globalAlpha = ghost ? 0.55 : invuln ? 0.4 : 1;

    // ---------- patterns ----------
    this.drawPattern(skin, pts, n);

    // ---------- head ----------
    const h = g.head;
    const hx = pts[0].x, hy = pts[0].y;
    const hr = this.cell * 0.5;
    const dx = g.dir.x, dy = g.dir.y;
    const a = Math.atan2(dy, dx);
    const pulse = 0.9 + Math.sin(g.time * 6) * 0.08;

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = skin.colors[0];
    ctx.shadowBlur = fire ? 24 : glow;

    this.drawHead(skin, hr, fire);
    ctx.shadowBlur = 0;

    // tongue flick
    if (Math.sin(g.time * 7) > 0.4) {
      const tl = hr * 0.9;
      ctx.strokeStyle = "#f87171";
      ctx.lineWidth = Math.max(1.5, hr * 0.12);
      ctx.beginPath();
      ctx.moveTo(hr * 0.7, 0);
      ctx.lineTo(hr * 0.7 + tl, 0);
      ctx.moveTo(hr * 0.7 + tl, 0);
      ctx.lineTo(hr * 0.7 + tl + hr * 0.25, -hr * 0.22);
      ctx.moveTo(hr * 0.7 + tl, 0);
      ctx.lineTo(hr * 0.7 + tl + hr * 0.25, hr * 0.22);
      ctx.stroke();
    }
    ctx.restore();

    // eyes (drawn in world space, forward-aligned)
    this.drawEyes(skin, hx, hy, a, hr);

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

  strokeBody(pts, n, width, style) {
    const { ctx } = this;
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    if (n === 1) { ctx.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.moveTo(pts[0].x, pts[0].y);
    // smooth through midpoints
    for (let i = 1; i < n - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
    ctx.stroke();
  }

  drawPattern(skin, pts, n) {
    const { ctx } = this;
    const pat = skin.pattern;
    if (!pat || pat === "none" || n < 3) return;
    const step = Math.max(1, Math.floor(n / 10));
    const t = this.game.time;
    for (let i = 1; i < n - 1; i += step) {
      const p = pts[i];
      const r = this.cell * 0.42;
      if (pat === "stripes" && (i / step) % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
      } else if (pat === "diamond") {
        ctx.fillStyle = `rgba(255,255,255,${0.22 + Math.sin(t * 3 + i) * 0.08})`;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4);
        ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
        ctx.restore();
      } else if (pat === "scales") {
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, -1.2, 1.2); ctx.stroke();
      } else if (pat === "hex") {
        ctx.fillStyle = `rgba(255,255,255,${0.16 + Math.sin(t * 4 + i * 2) * 0.08})`;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k + Math.PI / 6;
          const px = p.x + Math.cos(ang) * r * 0.35, py = p.y + Math.sin(ang) * r * 0.35;
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
      } else if (pat === "pulse" && i % (step * 2) === 0) {
        const br = r * (0.5 + Math.abs(Math.sin(t * 5 + i)) * 0.5);
        ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 5 + i) * 60},60,0.5)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, Math.PI * 2); ctx.fill();
      } else if (pat === "rainbow") {
        ctx.fillStyle = `hsl(${(t * 160 + i * 24) % 360},90%,62%)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  drawHead(skin, hr, fire) {
    const { ctx } = this;
    const c0 = skin.colors[0], c1 = skin.colors[1];
    const head = skin.head || "round";
    // base head shape
    ctx.beginPath();
    if (head === "crystal" || head === "prism") {
      ctx.moveTo(hr * 1.1, 0);
      ctx.lineTo(hr * 0.3, -hr * 0.75);
      ctx.lineTo(-hr * 0.7, -hr * 0.5);
      ctx.lineTo(-hr * 0.7, hr * 0.5);
      ctx.lineTo(hr * 0.3, hr * 0.75);
      ctx.closePath();
    } else if (head === "visor" || head === "drone") {
      ctx.moveTo(hr * 1.15, 0);
      ctx.quadraticCurveTo(hr * 0.2, -hr * 0.85, -hr * 0.85, -hr * 0.45);
      ctx.lineTo(-hr * 0.85, hr * 0.45);
      ctx.quadraticCurveTo(hr * 0.2, hr * 0.85, hr * 1.15, 0);
      ctx.closePath();
    } else {
      ctx.arc(0, 0, hr, 0, Math.PI * 2);
    }
    const hg = ctx.createLinearGradient(-hr, -hr, hr, hr);
    hg.addColorStop(0, c0);
    hg.addColorStop(1, c1);
    ctx.fillStyle = hg;
    ctx.fill();

    // head accessories
    if (head === "crown") {
      ctx.fillStyle = "#fde047";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * hr * 0.35 - hr * 0.16, -hr * 0.5);
        ctx.lineTo(i * hr * 0.35, -hr * 1.05);
        ctx.lineTo(i * hr * 0.35 + hr * 0.16, -hr * 0.5);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-hr * 0.5, -hr * 0.55, hr, hr * 0.22);
    } else if (head === "horns") {
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = hr * 0.18;
      ctx.beginPath(); ctx.moveTo(-hr * 0.5, -hr * 0.4); ctx.quadraticCurveTo(-hr * 0.7, -hr * 1.1, -hr * 0.2, -hr * 1.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hr * 0.5, -hr * 0.4); ctx.quadraticCurveTo(hr * 0.7, -hr * 1.1, hr * 0.2, -hr * 1.15); ctx.stroke();
      if (fire) {
        ctx.fillStyle = "rgba(251,146,60,0.8)";
        ctx.beginPath(); ctx.arc(-hr * 0.2, -hr * 1.15, hr * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hr * 0.2, -hr * 1.15, hr * 0.2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (head === "fang" || head === "royal") {
      ctx.fillStyle = head === "royal" ? "#fde047" : "#fff";
      ctx.beginPath(); ctx.moveTo(hr * 0.7, 0); ctx.lineTo(hr * 1.25, hr * 0.3); ctx.lineTo(hr * 0.7, hr * 0.5); ctx.closePath(); ctx.fill();
      if (head === "royal") {
        ctx.strokeStyle = "#f0abfc"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, hr * 1.25, -Math.PI * 0.9, Math.PI * 0.9); ctx.stroke();
      }
    } else if (head === "visor") {
      ctx.fillStyle = "rgba(8,145,178,0.95)";
      ctx.fillRect(-hr * 0.1, -hr * 0.5, hr * 1.0, hr * 1.0);
      ctx.fillStyle = "rgba(165,243,252,0.9)";
      ctx.fillRect(hr * 0.4, -hr * 0.55, hr * 0.28, hr * 1.1);
    } else if (head === "drone") {
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath(); ctx.arc(hr * 0.45, -hr * 0.3, hr * 0.2, 0, Math.PI * 2); ctx.arc(hr * 0.45, hr * 0.3, hr * 0.2, 0, Math.PI * 2); ctx.fill();
    }
    // gloss highlight
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath(); ctx.ellipse(-hr * 0.25, -hr * 0.35, hr * 0.45, hr * 0.22, -0.5, 0, Math.PI * 2); ctx.fill();
  }

  drawEyes(skin, hx, hy, a, hr) {
    const { ctx } = this;
    const off = hr * 0.38;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a);
    const eyeStyle = skin.eyes || "normal";
    const glowC = skin.colors[0];
    const eyes = [[-off * 0.15, -off], [-off * 0.15, off]];
    for (const [ex, ey] of eyes) {
      if (eyeStyle === "square") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(ex - 3, ey - 3, 6, 6);
        ctx.fillStyle = "#000";
        ctx.fillRect(ex - 1.2, ey - 1.2, 2.4, 2.4);
      } else if (eyeStyle === "star") {
        ctx.fillStyle = "#fde047";
        ctx.shadowColor = "#fde047"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(ex, ey, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (eyeStyle === "fire") {
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#f97316"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fb923c";
        ctx.beginPath(); ctx.arc(ex - 0.6, ey - 0.6, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (eyeStyle === "glow") {
        ctx.fillStyle = glowC;
        ctx.shadowColor = glowC; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath(); ctx.arc(ex + 1, ey, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // animated preview used by the snake-selection screen
  drawSkinPreview(canvas, skinId, t) {
    const ctx2 = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const skin = skinById(skinId) || skinById("classic");
    const cx = W / 2, cy = H / 2;
    ctx2.clearRect(0, 0, W, H);
    // ambient ring
    const rg = ctx2.createRadialGradient(cx, cy, 8, cx, cy, Math.min(W, H) * 0.46);
    rg.addColorStop(0, "rgba(255,255,255,0.06)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx2.fillStyle = rg;
    ctx2.fillRect(0, 0, W, H);
    // snake body as a smooth wave
    const amp = Math.min(W, H) * 0.16;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      const x = cx + Math.cos(t * 1.4 + k * Math.PI * 2) * Math.min(W, H) * 0.3;
      const y = cy + Math.sin(t * 1.4 + k * Math.PI * 2 + 0.6) * amp * (1 - k * 0.4);
      pts.push({ x, y });
    }
    ctx2.lineCap = "round"; ctx2.lineJoin = "round";
    ctx2.shadowColor = "rgba(0,0,0,0.35)"; ctx2.shadowBlur = 6;
    this.strokeBodyTaper(pts.map((p) => ({ x: p.x + 2, y: p.y + 3 })), 18, 7, "rgba(0,0,0,0.3)");
    ctx2.shadowBlur = 0;
    if (!this.battery) { ctx2.shadowColor = skin.colors[0]; ctx2.shadowBlur = 16; }
    this.strokeBodyTaper(pts, 17, 7, skin.colors[0]);
    ctx2.shadowBlur = 0;
    this.strokeBodyTaper(pts, 14, 5, skin.colors[1]);
    ctx2.globalAlpha = 0.5;
    this.strokeBodyTaper(pts.map((p) => ({ x: p.x - 1.5, y: p.y - 1.5 })), 6, 2, "rgba(255,255,255,0.5)");
    ctx2.globalAlpha = 1;
    // head at pts[0]
    const h = pts[0];
    const nxt = pts[1];
    const a = Math.atan2(nxt.y - h.y, nxt.x - h.x);
    ctx2.save();
    ctx2.translate(h.x, h.y);
    ctx2.rotate(a);
    ctx2.scale(1 + Math.sin(t * 6) * 0.06, 1 + Math.sin(t * 6) * 0.06);
    ctx2.shadowColor = skin.colors[0];
    ctx2.shadowBlur = skin.glow || 8;
    this.drawHead(skin, 13, false);
    ctx2.shadowBlur = 0;
    ctx2.restore();
    this.drawEyes(skin, h.x, h.y, a, 13);
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
