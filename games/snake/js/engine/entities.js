// LoveHub Snake — entity spawn + update logic (grid-based).
export function spawnEntities(level) {
  const mk = (o) => ({ ...o, px: o.x, py: o.y });
  return {
    foods: (level.foods || []).map(mk),
    gems: (level.gems || []).map(mk),
    keys: (level.keys || []).map(mk),
    portal: level.portal ? { ...level.portal } : null,
    secret: level.secret ? { ...level.secret, found: false } : null,
    powerups: (level.powerups || []).filter((p) => !p.taken).map(mk),
    mines: (level.mines || []).map((m) => mk({ ...m, armed: false, fuseT: 0 })),
    projectiles: [],
    enemies: (level.enemies || []).map((e) => mk({ ...e, state: "idle", timer: 0, tick: 0 })),
    mwalls: (level.movingWalls || []).map(mk),
    lasers: (level.lasers || []).map(mk),
    teleporters: (level.teleporters || []).map(mk),
    staticCells: {
      lava: level.lava || [], spikes: level.spikes || [], ice: level.ice || [],
      poison: level.poison || [], wind: level.wind || [], walls: level.static || [],
    },
  };
}

export function movingWallCells(mw) {
  const cells = [];
  for (let i = 0; i < mw.len; i++) {
    if (mw.axis === "x") cells.push(`${mw.x + i},${mw.y}`);
    else cells.push(`${mw.x},${mw.y + i}`);
  }
  return cells;
}

export function wallOccupancy(mwalls) {
  const occ = new Set();
  for (const mw of mwalls) {
    for (const c of movingWallCells(mw)) occ.add(c);
  }
  return occ;
}

export function updateEnemies(enemies, game) {
  const { head } = game;
  for (const e of enemies) {
    e.cd -= game.dt;
    if (e.cd > 0) continue;
    e.cd = 0.35 + Math.random() * 0.15;

    // decide target cell
    let tx = null, ty = null;
    const hx = Math.round(head.x), hy = Math.round(head.y);
    const dx = hx - e.x, dy = hy - e.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (e.ai === "ambush") {
      if (e.state === "idle") {
        if (dist <= 4) { e.state = "active"; e.timer = 3; game.fx.ring(e.x, e.y, "#f472b6"); }
      } else {
        e.timer -= game.dt;
        if (e.timer <= 0) e.state = "idle";
        tx = hx; ty = hy;
      }
    } else if (e.ai === "chase" || e.ai === "coordinate") {
      tx = hx; ty = hy;
    } else if (e.ai === "predict") {
      tx = hx + game.dir.x * 2; ty = hy + game.dir.y * 2;
    } else { // patrol
      const nx = e.x + e.dir.x, ny = e.y + e.dir.y;
      if (game.blocked(nx, ny) || nx < 0 || ny < 0) { e.dir.x *= -1; e.dir.y *= -1; }
      tx = e.x + e.dir.x; ty = e.y + e.dir.y;
    }

    // move one cell toward (tx,ty) greedily
    if (tx !== null) {
      const nx = e.x + Math.sign(tx - e.x);
      const ny = e.y + Math.sign(ty - e.y);
      const ox = Math.sign(tx - e.x) !== 0 && !game.blocked(nx, e.y) ? nx : e.x;
      const oy = Math.sign(ty - e.y) !== 0 && !game.blocked(e.x, ny) ? ny : e.y;
      if (ox !== e.x || oy !== e.y) {
        e.px = e.x; e.py = e.y; e.x = ox; e.y = oy;
      }
    }
    // enemy consumes adjacent food
    const fi = game.ents.foods.findIndex((f) => f.x === e.x && f.y === e.y);
    if (fi >= 0) game.ents.foods.splice(fi, 1);
  }
}

export function updateMwalls(mwalls, game) {
  const { level } = game;
  for (const mw of mwalls) {
    mw.px = mw.x; mw.py = mw.y;
    if (mw.axis === "x") {
      mw.fx = (mw.fx ?? mw.x) + mw.dir * mw.speed * game.dt;
      let target = Math.round(mw.fx);
      if (target + mw.len - 1 >= level.cols - 1 || target <= 0) { mw.dir *= -1; mw.fx = mw.fx + mw.dir * mw.speed * game.dt; target = Math.round(mw.fx); }
      mw.x = target;
    } else {
      mw.fy = (mw.fy ?? mw.y) + mw.dir * mw.speed * game.dt;
      let target = Math.round(mw.fy);
      if (target + mw.len - 1 >= level.rows - 1 || target <= 0) { mw.dir *= -1; mw.fy = mw.fy + mw.dir * mw.speed * game.dt; target = Math.round(mw.fy); }
      mw.y = target;
    }
  }
}

export function updateLasers(lasers, game) {
  for (const l of lasers) {
    l.active = Math.sin(game.time * (Math.PI * 2 / l.period) + l.phase) > 0;
  }
}

export function updateMines(mines, game) {
  const hx = Math.round(game.head.x), hy = Math.round(game.head.y);
  for (let i = mines.length - 1; i >= 0; i--) {
    const m = mines[i];
    const d = Math.abs(m.x - hx) + Math.abs(m.y - hy);
    if (d <= 2) m.armed = true;
    if (m.armed) {
      m.fuseT += game.dt;
      m.blink = Math.sin(game.time * 30) > 0;
      if (m.fuseT >= 0.7) {
        game.explodeAt(m.x, m.y);
        mines.splice(i, 1);
      }
    }
  }
}

export function updateProjectiles(projectiles, game) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * game.dt;
    p.y += p.vy * game.dt;
    p.life -= game.dt;
    if (p.life <= 0 || game.blocked(Math.round(p.x), Math.round(p.y))) {
      game.fx.burst(p.x, p.y, p.color, { count: 6, speed: 1.5, life: 0.3 });
      projectiles.splice(i, 1);
      continue;
    }
    const hx = Math.round(game.head.x), hy = Math.round(game.head.y);
    if (Math.abs(p.x - hx) < 0.55 && Math.abs(p.y - hy) < 0.55) {
      projectiles.splice(i, 1);
      game.hitSnake("projectile");
    }
  }
}

export function isHazardAt(x, y, game) {
  const k = `${x},${y}`;
  const { staticCells, mines, mwalls, lasers } = game.ents;
  if (staticCells.lava.some((c) => c.x === x && c.y === y)) return true;
  if (staticCells.spikes.some((c) => c.x === x && c.y === y)) return true;
  if (staticCells.poison.some((c) => c.x === x && c.y === y)) return true;
  for (const m of mines) if (m.x === x && m.y === y) return true;
  if (game.mwallOcc.has(k)) return true;
  for (const l of lasers) {
    if (!l.active) continue;
    for (let i = 0; i < l.len; i++) {
      if (l.axis === "x" && l.x + i === x && l.y === y) return true;
      if (l.axis === "y" && l.y + i === y && l.x === x) return true;
    }
  }
  return false;
}

export function hazardAt(x, y, game) {
  const k = `${x},${y}`;
  const { staticCells, mines, mwalls, lasers, enemies } = game.ents;
  if (staticCells.lava.some((c) => c.x === x && c.y === y)) return "lava";
  if (staticCells.spikes.some((c) => c.x === x && c.y === y)) return "spikes";
  if (staticCells.poison.some((c) => c.x === x && c.y === y)) return "poison";
  if (staticCells.walls.some((c) => c.x === x && c.y === y)) return "wall";
  for (const m of mines) if (m.x === x && m.y === y) return "mine";
  if (game.mwallOcc.has(k)) return "wall";
  for (const l of lasers) {
    if (!l.active) continue;
    for (let i = 0; i < l.len; i++) {
      if (l.axis === "x" && l.x + i === x && l.y === y) return "laser";
      if (l.axis === "y" && l.y + i === y && l.x === x) return "laser";
    }
  }
  for (const e of enemies) if (e.x === x && e.y === y) return "enemy";
  return null;
}
