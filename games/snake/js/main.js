// LoveHub Snake — bootstrap: canvas, loop, input (keyboard / swipe / d-pad).
import { Game } from "./engine/game.js";
import { Renderer } from "./engine/render.js";
import { UI } from "./ui/menus.js";
import { loadProfile, profile } from "./core/state.js";
import { AudioSys } from "./core/audio.js";

const p = loadProfile();
const canvas = document.getElementById("game-canvas");

const game = new Game({ onEvent: () => {} });
const renderer = new Renderer(canvas, game);
const ui = new UI({
  game,
  renderer,
  root: document.getElementById("ui-root"),
  hudRoot: document.getElementById("hud"),
  toastRoot: document.getElementById("toast-root"),
  cinRoot: document.getElementById("cinematic-root"),
  dpadRoot: document.getElementById("dpad-root"),
});

game.difficulty = p.settings.difficulty || 1;
renderer.setSettings(p.settings);
game.fx.setQuality(p.settings.battery ? 0.5 : 1);
AudioSys.setEnabled(p.settings.sfx, p.settings.music);

function resize() {
  renderer.resize();
  renderer.layout();
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 250));
resize();

// ---------- input ----------
const KEY_DIRS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
  "٨": [0, -1], "٩": [0, 1], "٦": [-1, 0], "٣": [1, 0], // Persian keyboard arrows
};
window.addEventListener("keydown", (e) => {
  const d = KEY_DIRS[e.key];
  if (d) { e.preventDefault(); game.inputDir(d[0], d[1]); return; }
  if (e.key === " " || e.key === "Escape" || e.key === "p" || e.key === "P") {
    if (game.running && !game.over) game.togglePause();
  }
});

// ---------- touch controls ----------
// Two modes: continuous finger steering (default) and classic swipe.
let touchActive = false;
let lastSwipe = null;
let lastSteer = { x: 0, y: 0 };
let steerLockUntil = 0;

function headScreenPos() {
  const h = game.head;
  if (!h || !renderer) return null;
  return {
    x: renderer.boardX + h.x * renderer.cell + renderer.cell / 2 - renderer.camX,
    y: renderer.boardY + h.y * renderer.cell + renderer.cell / 2 - renderer.camY,
  };
}

function steerToward(clientX, clientY) {
  const hp = headScreenPos();
  if (!hp) return;
  const dx = clientX - hp.x;
  const dy = clientY - hp.y;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // dead zone at head
  const ax = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
  const ay = Math.abs(dy) >= Math.abs(dx) ? Math.sign(dy) : 0;
  if (ax === lastSteer.x && ay === lastSteer.y) return;
  if (performance.now() < steerLockUntil) return;
  lastSteer = { x: ax, y: ay };
  steerLockUntil = performance.now() + 110; // brief anti-jitter window
  game.inputDir(ax, ay);
}

canvas.addEventListener("touchstart", (e) => {
  touchActive = true;
  lastSwipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
  lastSteer = { x: 0, y: 0 };
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!touchActive) return;
  if (p.settings.dragSteer) steerToward(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  if (!touchActive) return;
  touchActive = false;
  const t = e.changedTouches[0];
  if (!p.settings.dragSteer && lastSwipe) {
    const dx = t.clientX - lastSwipe.x;
    const dy = t.clientY - lastSwipe.y;
    if (Math.abs(dx) >= 24 || Math.abs(dy) >= 24) {
      if (Math.abs(dx) > Math.abs(dy)) game.inputDir(Math.sign(dx), 0);
      else game.inputDir(0, Math.sign(dy));
    }
  }
  lastSwipe = null;
});

// mouse drag steering (desktop)
let mouseDown = false;
canvas.addEventListener("mousedown", (e) => { mouseDown = true; });
canvas.addEventListener("mousemove", (e) => {
  if (!mouseDown || !p.settings.dragSteer) return;
  steerToward(e.clientX, e.clientY);
});
canvas.addEventListener("mouseup", () => { mouseDown = false; });



// ---------- main loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  if (game.level) renderer.draw();
  ui.previewSkinLoop();
  ui.updateHUD(false);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// audio init on first gesture (autoplay policy)
const initAudio = () => {
  AudioSys.init();
  if (!game.running) AudioSys.startMusic("menu");
  window.removeEventListener("pointerdown", initAudio);
  window.removeEventListener("keydown", initAudio);
};
window.addEventListener("pointerdown", initAudio);
window.addEventListener("keydown", initAudio);

// premium loader fade-out, then show the menu
const loaderEl = document.getElementById("loader");
const boot = () => {
  if (loaderEl) {
    loaderEl.classList.add("done");
    setTimeout(() => loaderEl.remove(), 700);
  }
  ui.show("main");
};
// ensure the loader shows at least briefly for a cinematic feel
const t0 = performance.now();
if (document.readyState === "complete" && performance.now() - t0 > 200) boot();
else setTimeout(boot, 350);
