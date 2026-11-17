// Desa Kehidupan — audio.js
// Semua suara disintesis dengan WebAudio (tanpa file audio): SFX aksi dan
// lagu latar chiptune sederhana yang berputar.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  sfx(name) {
    if (this.muted) return;
    switch (name) {
      case 'coin': this.tone(880, 0.08, 'square', 0.12); this.tone(1318, 0.14, 'square', 0.1, 0.07); break;
      case 'plant': this.tone(300, 0.1, 'triangle', 0.15, 0, 500); break;
      case 'water': this.tone(500, 0.25, 'sine', 0.12, 0, 180); break;
      case 'dig': this.tone(140, 0.12, 'sawtooth', 0.12, 0, 70); break;
      case 'gem': this.tone(1046, 0.1, 'sine', 0.15); this.tone(1568, 0.18, 'sine', 0.12, 0.09); break;
      case 'fish': this.tone(600, 0.08, 'square', 0.12); this.tone(900, 0.1, 'square', 0.12, 0.08); break;
      case 'splash': this.tone(400, 0.2, 'sine', 0.1, 0, 120); break;
      case 'talk': this.tone(700, 0.06, 'square', 0.08); this.tone(900, 0.06, 'square', 0.07, 0.06); break;
      case 'heart': this.tone(523, 0.12, 'sine', 0.12); this.tone(659, 0.12, 'sine', 0.12, 0.1); this.tone(784, 0.2, 'sine', 0.12, 0.2); break;
      case 'eat': this.tone(250, 0.08, 'triangle', 0.14); this.tone(320, 0.08, 'triangle', 0.12, 0.08); break;
      case 'buy': this.tone(660, 0.08, 'square', 0.1); this.tone(990, 0.16, 'square', 0.1, 0.07); break;
      case 'error': this.tone(180, 0.18, 'sawtooth', 0.1, 0, 120); break;
      case 'sleep': this.tone(392, 0.3, 'sine', 0.1); this.tone(330, 0.3, 'sine', 0.1, 0.25); this.tone(262, 0.5, 'sine', 0.1, 0.5); break;
      case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.25, 'square', 0.1, i * 0.14)); break;
      case 'lose': [400, 350, 300, 220].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.11, i * 0.2)); break;
      case 'festival': [523, 659, 784, 659, 880, 784].forEach((f, i) => this.tone(f, 0.18, 'square', 0.09, i * 0.12)); break;
      default: this.tone(440, 0.08, 'square', 0.08); break;
    }
  }

  // Melodi desa: 16 langkah, dua suara (melodi + bass), loop tiap ~4 detik.
  startMusic() {
    if (this.musicTimer) return;
    const melody = [523, 0, 659, 784, 880, 0, 784, 659, 587, 0, 659, 523, 440, 0, 523, 0];
    const bass = [131, 0, 165, 0, 196, 0, 165, 0, 147, 0, 165, 0, 110, 0, 131, 0];
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const i = this.musicStep % 16;
      if (melody[i]) this.tone(melody[i], 0.22, 'triangle', 0.05);
      if (bass[i]) this.tone(bass[i], 0.22, 'sine', 0.06);
      this.musicStep += 1;
    }, 250);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
