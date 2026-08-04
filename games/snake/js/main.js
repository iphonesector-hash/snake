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

// swipe (touch)
let ts = null;
canvas.addEventListener("touchstart", (e) => { ts = e.touches[0]; }, { passive: true });
canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
canvas.addEventListener("touchend", (e) => {
  if (!ts) return;
  const dx = e.changedTouches[0].clientX - ts.clientX;
  const dy = e.changedTouches[0].clientY - ts.clientY;
  ts = null;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) game.inputDir(Math.sign(dx), 0);
  else game.inputDir(0, Math.sign(dy));
});

// swipe (mouse, for desktop)
let ms = null;
canvas.addEventListener("mousedown", (e) => { ms = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener("mouseup", (e) => {
  if (!ms) return;
  const dx = e.clientX - ms.x, dy = e.clientY - ms.y;
  ms = null;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) game.inputDir(Math.sign(dx), 0);
  else game.inputDir(0, Math.sign(dy));
});

// ---------- main loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  if (game.level) renderer.draw();
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

ui.show("main");
