// LoveHub Snake — procedural WebAudio engine (SFX + adaptive music). No audio files needed.
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.timer = null;
    this.step = 0;
    this.mood = "menu";
    this.intensity = 0;
    this.moods = {
      menu:    { root: 220, scale: [0, 4, 7, 12, 16], bpm: 92,  wave: "triangle" },
      forest:  { root: 196, scale: [0, 3, 7, 12, 15], bpm: 96,  wave: "triangle" },
      ice:     { root: 262, scale: [0, 3, 7, 10, 15], bpm: 78,  wave: "sine" },
      volcano: { root: 147, scale: [0, 1, 7, 8, 12],  bpm: 118, wave: "sawtooth" },
      ocean:   { root: 165, scale: [0, 2, 7, 12, 14], bpm: 84,  wave: "sine" },
      space:   { root: 110, scale: [0, 2, 7, 9, 14],  bpm: 88,  wave: "sine" },
      cyber:   { root: 130, scale: [0, 1, 4, 7, 8],   bpm: 124, wave: "square" },
      shadow:  { root: 98,  scale: [0, 1, 6, 8, 13],  bpm: 72,  wave: "sawtooth" },
      desert:  { root: 174, scale: [0, 2, 5, 7, 10],  bpm: 100, wave: "triangle" },
      dream:   { root: 233, scale: [0, 4, 7, 11, 14], bpm: 104, wave: "sine" },
      final:   { root: 87,  scale: [0, 1, 7, 12, 13], bpm: 132, wave: "sawtooth" },
      boss:    { root: 82,  scale: [0, 1, 4, 7, 10],  bpm: 128, wave: "square" },
    };
  }

  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
    } catch { this.ctx = null; }
  }

  setEnabled(sfx, music) {
    this.sfxOn = sfx; this.musicOn = music;
    if (this.ctx) {
      this.sfxGain.gain.value = sfx ? 1 : 0;
      this.musicGain.gain.value = music ? 0.32 : 0;
    }
  }

  _tone(freq, dur, type, vol, slideTo, when) {
    if (!this.ctx || !this.sfxOn) return;
    const t = when || this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 20), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, freq, when) {
    if (!this.ctx || !this.sfxOn) return;
    const t = when || this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = freq || 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  play(name, combo) {
    if (!this.ctx) return;
    switch (name) {
      case "eat":      this._tone(440 + (combo || 0) * 30, 0.09, "triangle", 0.18, 660); break;
      case "gold":     this._tone(660, 0.12, "triangle", 0.2, 990); this._tone(990, 0.14, "sine", 0.12, 1320, this.ctx.currentTime + 0.06); break;
      case "gem":      this._tone(880, 0.1, "sine", 0.16, 1320); break;
      case "key":      this._tone(740, 0.12, "triangle", 0.18, 1108); break;
      case "power":    this._tone(523, 0.1, "square", 0.1, 784); this._tone(784, 0.14, "square", 0.1, 1046, this.ctx.currentTime + 0.08); break;
      case "shield":   this._tone(300, 0.25, "sine", 0.16, 150); break;
      case "hurt":     this._noise(0.18, 0.25, 700); this._tone(160, 0.2, "sawtooth", 0.12, 80); break;
      case "die":      this._tone(300, 0.5, "sawtooth", 0.18, 40); this._noise(0.4, 0.25, 400); break;
      case "click":    this._tone(600, 0.05, "square", 0.06, 900); break;
      case "coin":     this._tone(1046, 0.07, "square", 0.08, 1318); this._tone(1568, 0.09, "square", 0.06, 2093, this.ctx.currentTime + 0.05); break;
      case "star":     this._tone(784, 0.12, "triangle", 0.16, 1046); this._tone(1046, 0.12, "triangle", 0.14, 1568, this.ctx.currentTime + 0.09); this._tone(1568, 0.2, "triangle", 0.12, 2093, this.ctx.currentTime + 0.18); break;
      case "win":      [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.22, "triangle", 0.16, f * 1.5, this.ctx.currentTime + i * 0.12)); break;
      case "bossRoar": this._tone(90, 0.8, "sawtooth", 0.22, 45); this._noise(0.6, 0.2, 300); break;
      case "shoot":    this._tone(880, 0.12, "square", 0.08, 220); this._noise(0.1, 0.1, 2000); break;
      case "boom":     this._noise(0.5, 0.3, 500); this._tone(120, 0.4, "sawtooth", 0.2, 30); break;
      case "secret":   this._tone(392, 0.14, "sine", 0.14, 523); this._tone(523, 0.14, "sine", 0.14, 659, this.ctx.currentTime + 0.1); this._tone(659, 0.2, "sine", 0.14, 784, this.ctx.currentTime + 0.2); break;
      case "levelup":  [440, 554, 659, 880].forEach((f, i) => this._tone(f, 0.14, "triangle", 0.14, f * 1.3, this.ctx.currentTime + i * 0.07)); break;
      case "portal":   this._tone(330, 0.3, "sine", 0.16, 660); this._tone(660, 0.3, "sine", 0.14, 1320, this.ctx.currentTime + 0.12); this._noise(0.3, 0.08, 3000); break;
      case "shock":    this._noise(0.4, 0.3, 2500); this._tone(200, 0.3, "square", 0.14, 60); break;
      case "tick":     this._tone(200, 0.03, "square", 0.04, 180); break;
    }
  }

  // ---------- adaptive music ----------
  startMusic(mood, intensity = 0) {
    if (!this.ctx) return;
    this.mood = mood || "menu";
    this.intensity = intensity || 0;
    if (this.timer) clearInterval(this.timer);
    this.step = 0;
    if (!this.musicOn) return;
    const m = this.moods[this.mood] || this.moods.menu;
    const spb = 60 / m.bpm / 2; // eighth note
    this.timer = setInterval(() => {
      if (!this.ctx) return;
      this._scheduleStep(m, spb);
      this.step++;
    }, spb * 1000);
  }

  _scheduleStep(m, spb) {
    const t = this.ctx.currentTime;
    const root = m.root;
    const scale = m.scale;
    const bar = Math.floor(this.step / 8);
    const stepInBar = this.step % 8;
    const chordRoot = scale[bar % scale.length];
    const f = root * Math.pow(2, chordRoot / 12);
    const r = Math.random();
    const bassSteps = [0, 5, 3, 5];
    if (this.intensity >= 2 && r < 0.3) {
      const n = f * Math.pow(2, scale[Math.floor(Math.random() * scale.length)] / 12) * 2;
      this._tone(n, spb * 1.6, m.wave, 0.05, n * 1.005, t);
    }
    if (stepInBar % 2 === 0) {
      this._tone(f, spb * 1.8, "sine", 0.14, f * 0.99, t);
    }
    if (this.intensity >= 1 && r < 0.5) {
      const n = f * Math.pow(2, scale[bassSteps[stepInBar % 4]] / 12);
      this._tone(n, spb * 0.9, m.wave, 0.06, n * 1.01, t + spb * 0.5);
    }
    if (r < 0.18 + this.intensity * 0.1) {
      const n = f * Math.pow(2, scale[Math.floor(Math.random() * scale.length)] / 12) * 2;
      this._tone(n, spb * 1.2, m.wave, 0.07, n * 1.01, t + spb * 0.25);
    }
  }

  setIntensity(i) { this.intensity = Math.max(0, Math.min(3, i)); }
  stopMusic() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
}

export const AudioSys = new AudioEngine();
