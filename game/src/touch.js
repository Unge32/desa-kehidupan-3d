// Desa Kehidupan 3D — touch.js
// Kontrol sentuh mobile-first: joystick virtual kiri-bawah dan tombol aksi
// kanan-bawah (AKSI, PANCING, TAS, TOKO). Semua elemen adalah tombol DOM
// besar (min. 56px) supaya nyaman ditekan jempol di HP portrait.
// Joystick menulis vektor analog ke input.setJoy; tombol memanggil
// callback `onAction(name)` yang dihubungkan main.js.
export function createTouchControls(input, onAction) {
  const root = document.getElementById('touch');
  if (!root) return null;

  const joy = document.getElementById('joy');
  const knob = document.getElementById('joy-knob');
  let joyId = null;
  let joyCenter = { x: 0, y: 0 };

  const joyRadius = () => joy.clientWidth / 2;

  function joyMove(clientX, clientY) {
    const r = joyRadius();
    let dx = (clientX - joyCenter.x) / r;
    let dy = (clientY - joyCenter.y) / r;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    // Dead-zone kecil supaya tidak jalan sendiri.
    if (Math.hypot(dx, dy) < 0.12) { dx = 0; dy = 0; }
    knob.style.transform = `translate(${dx * r * 0.55}px, ${dy * r * 0.55}px)`;
    input.setJoy(dx, dy, dx !== 0 || dy !== 0);
  }

  function joyEnd() {
    joyId = null;
    knob.style.transform = 'translate(0px, 0px)';
    input.setJoy(0, 0, false);
  }

  joy.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joyId = e.pointerId;
    const rect = joy.getBoundingClientRect();
    joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    joy.setPointerCapture(e.pointerId);
    joyMove(e.clientX, e.clientY);
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    e.preventDefault();
    joyMove(e.clientX, e.clientY);
  });
  const end = (e) => { if (e.pointerId === joyId) joyEnd(); };
  joy.addEventListener('pointerup', end);
  joy.addEventListener('pointercancel', end);

  // Tombol aksi.
  const bind = (id, name) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onAction(name);
    });
  };
  bind('btn-action', 'action');
  bind('btn-fish', 'fish');
  bind('btn-bag', 'inventory');
  bind('btn-shop', 'shop');

  return {
    setFishEnabled(enabled) {
      const b = document.getElementById('btn-fish');
      if (b) b.classList.toggle('disabled', !enabled);
    },
    setVisible(v) {
      root.style.display = v ? '' : 'none';
    },
  };
}
