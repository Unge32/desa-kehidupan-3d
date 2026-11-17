// Desa Kehidupan 3D — input.js
// Keyboard + state joystick virtual. Keyboard dibaca per-frame lewat
// `held`, sedangkan `pressed` hanya hidup satu frame (aksi sekali tekan).
// Joystick ditulis oleh touch.js (joyX/joyY -1..1, joyActive).
export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.joyX = 0;
    this.joyY = 0;
    this.joyActive = false;
    this.onKey = null;
    window.addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) {
        this.held.add(k);
        this.pressed.add(k);
        if (this.onKey) this.onKey(k);
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.held.delete(k);
    });
    window.addEventListener('blur', () => { this.held.clear(); this.setJoy(0, 0, false); });
  }

  setJoy(x, y, active) {
    this.joyX = x;
    this.joyY = y;
    this.joyActive = active;
  }

  endFrame() {
    this.pressed.clear();
  }

  isDown(...keys) {
    return keys.some((k) => this.held.has(k));
  }

  wasPressed(...keys) {
    return keys.some((k) => this.pressed.has(k));
  }
}
