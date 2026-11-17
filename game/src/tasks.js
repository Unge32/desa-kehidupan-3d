// Desa Kehidupan — tasks.js
// Tugas bantu warga yang DIBAYAR Gold (duit mainan): bicara ke warga untuk
// menerima tugas, kerjakan, lalu bicara lagi untuk mengambil hadiah.
// Tugas antar barang memakan stok tas; tugas hitung memakai selisih stat
// sejak tugas diterima.
export const TASK_DEFS = [
  {
    id: 'antar_lobak', npc: 'tani', title: 'Antar 3 Lobak', reward: 300,
    type: 'deliver', item: 'panen_lobak', count: 3,
    offer: 'Tolong antarkan 3 Lobak ke rumahku. Kalau selesai, kubayar 300G.',
    progress: (have, need) => `Lobak di tas: ${have}/${need}.`,
    done: 'Terima kasih! Lobaknya segar-segar. Ini upahmu: 300G.',
  },
  {
    id: 'tangkap_ikan', npc: 'budi', title: 'Tangkap 2 Ikan', reward: 400,
    type: 'count', stat: 'fishCaught', count: 2,
    offer: 'Tolong tangkapkan 2 ikan untuk makan malamku. Kubayar 400G!',
    progress: (have, need) => `Ikan ditangkap: ${have}/${need}.`,
    done: 'Ikan segar! Kau memang nelayan berbakat. Ini 400G untukmu.',
  },
  {
    id: 'bantu_panen', npc: 'sari', title: 'Panen 5 Sayur', reward: 450,
    type: 'count', stat: 'harvested', count: 5,
    offer: 'Pasarku kehabisan stok. Bantu panen 5 sayur, kubayar 450G.',
    progress: (have, need) => `Sayur dipanen: ${have}/${need}.`,
    done: 'Panenmu bagus! Pelangganku pasti senang. Ini upahmu: 450G.',
  },
  {
    id: 'bunga_rani', npc: 'rani', title: 'Beri 1 Bunga', reward: 250, hearts: 1,
    type: 'deliver', item: 'bunga', count: 1,
    offer: 'Aku suka bunga... Kalau kau membawakanku 1 Buket Bunga, kuberi 250G.',
    progress: (have, need) => `Buket Bunga di tas: ${have}/${need}.`,
    done: 'Bunganya cantik sekali! Terima kasih. Ini 250G dariku.',
  },
];

export function taskStatus(world, id) {
  const t = world.tasks[id];
  return t ? t.status : 'none';
}

export function taskForNpc(world, npcId) {
  return TASK_DEFS.find((d) => d.npc === npcId) || null;
}

export function acceptTask(world, def) {
  world.tasks[def.id] = {
    status: 'active',
    base: def.type === 'count' ? world.stats[def.stat] : 0,
  };
}

export function taskProgress(world, def) {
  const t = world.tasks[def.id];
  if (!t || t.status !== 'active') return { ready: false, have: 0, need: def.count, text: '' };
  let have = 0;
  if (def.type === 'deliver') have = Math.min(def.count, world.inventory[def.item] || 0);
  else have = Math.min(def.count, world.stats[def.stat] - t.base);
  return { ready: have >= def.count, have, need: def.count, text: def.progress(have, def.count) };
}

export function completeTask(world, def) {
  if (def.type === 'deliver') world.inventory[def.item] -= def.count;
  world.gold += def.reward;
  world.stats.earned += def.reward;
  world.tasks[def.id].status = 'done';
  const npc = world.npcs.find((n) => n.id === def.npc);
  if (def.hearts && npc) npc.hearts = Math.min(5, npc.hearts + def.hearts);
  return `${def.done}${def.hearts ? ` (+${def.hearts} ❤)` : ''}`;
}

export function activeTasks(world) {
  return TASK_DEFS
    .filter((d) => taskStatus(world, d.id) === 'active')
    .map((d) => {
      const p = taskProgress(world, d);
      return { title: d.title, reward: d.reward, text: `${d.title} — ${p.text} Hadiah ${d.reward}G.` };
    });
}
