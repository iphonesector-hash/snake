// LoveHub Snake — particles & floating text FX.
export class Particles {
  constructor() {
    this.list = [];
    this.max = 400;
    this.quality = 1; // 1 = full, 0.5 = battery
  }

  setQuality(q) { this.quality = q; }

  burst(x, y, color, opts = {}) {
    const n = Math.max(1, Math.round((opts.count || 12) * this.quality));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 2.5) * (0.4 + Math.random() * 0.8);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0),
        life: 0, max: opts.life || 0.6, size: opts.size || 2.5,
        color, gravity: opts.gravity ?? 0.05, glow: opts.glow ?? false,
        shape: opts.shape || "dot",
      });
    }
    this.trim();
  }

  ring(x, y, color, r = 8, life = 0.45) {
    this.list.push({ x, y, vx: 0, vy: 0, life: 0, max: life, size: r, color, gravity: 0, glow: true, shape: "ring" });
    this.trim();
  }

  confetti(x, y, colors, n = 24) {
    const col = colors || ["#fde047", "#f472b6", "#22d3ee", "#a78bfa", "#4ade80"];
    this.burst(x, y, col[0], { count: n, speed: 4, up: 2, life: 0.9, gravity: 0.12, size: 3, glow: true });
  }

  trim() { if (this.list.length > this.max) this.list.splice(0, this.list.length - this.max); }

  update(dt) {
    const s = dt * 60;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life += dt;
      if (p.life >= p.max) { this.list.splice(i, 1); continue; }
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.vy += p.gravity * s;
      if (p.gravity > 0) p.vx *= 0.99;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const k = 1 - p.life / p.max;
      if (p.shape === "ring") {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - k) * 3), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      if (p.glow) ctx.shadowBlur = 8, ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + k), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
}

export class Floaters {
  constructor() { this.list = []; }
  add(x, y, text, color = "#fff", size = 16) {
    this.list.push({ x, y, text, color, size, life: 0, max: 0.9, vy: -1.6 });
  }
  update(dt) {
    const s = dt * 60;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.life += dt;
      f.y += f.vy * s;
      if (f.life >= f.max) this.list.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const f of this.list) {
      const k = 1 - f.life / f.max;
      ctx.globalAlpha = k;
      ctx.font = `800 ${f.size}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.fillText(f.text, f.x + 1.5, f.y + 1.5);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }
}
