// Desa Kehidupan — config.js
// Satu tempat untuk semua angka dan data game: ukuran dunia, musim, tanaman,
// ikan, permata, hewan, barang toko, dan para penduduk desa.
export const TILE = 32;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const MAP_W = 52;
export const MAP_H = 36;

// Jam game: 1 jam game = 12 detik nyata. Hari 06:00-24:00, tidur ke hari berikut.
export const SECONDS_PER_HOUR = 12;
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 24;
export const DAYS_PER_SEASON = 7;
export const SEASONS = ['Semi', 'Panas', 'Gugur', 'Dingin'];
export const SEASON_NAMES = ['Musim Semi', 'Musim Panas', 'Musim Gugur', 'Musim Dingin'];
export const WEATHERS = ['Cerah', 'Hujan', 'Berawan', 'Badai'];
export const YEAR_DAYS = 28;
export const WIN_GOLD = 50000;
export const BIG_HOUSE_PRICE = 50000;
export const LAND_PRICE = 8000;

export const CROPS = {
  lobak: { name: 'Lobak', seed: 20, sell: 90, days: 2, seasons: [0, 1, 2], color: '#ff5a4e', leaf: '#3fae4a' },
  wortel: { name: 'Wortel', seed: 35, sell: 150, days: 3, seasons: [0, 1, 2], color: '#ff8c1a', leaf: '#2f9e44' },
  tomat: { name: 'Tomat', seed: 60, sell: 260, days: 4, seasons: [1, 2], color: '#e63946', leaf: '#2b8a3e' },
  gandum: { name: 'Gandum', seed: 45, sell: 200, days: 3, seasons: [0, 1, 2, 3], color: '#e9c46a', leaf: '#c9a227' },
  labu: { name: 'Labu', seed: 90, sell: 420, days: 5, seasons: [2, 3], color: '#f4842b', leaf: '#3d8b40' },
  stroberi: { name: 'Stroberi', seed: 40, sell: 170, days: 3, seasons: [0, 1], color: '#ff4d6d', leaf: '#2f9e44' },
};

export const FISH = {
  ikanMas: { name: 'Ikan Mas', sell: 80, seasons: [0, 1, 2, 3], weight: 5 },
  lele: { name: 'Lele', sell: 120, seasons: [1, 2], weight: 4 },
  nila: { name: 'Nila', sell: 150, seasons: [0, 1], weight: 3 },
  kakap: { name: 'Kakap', sell: 300, seasons: [1, 2], weight: 2 },
  hiuKecil: { name: 'Hiu Kecil', sell: 600, seasons: [2, 3], weight: 1 },
};

export const GEMS = {
  batu: { name: 'Batu Biasa', sell: 15, weight: 10 },
  kuarsa: { name: 'Kuarsa', sell: 120, weight: 5 },
  rubi: { name: 'Rubi', sell: 450, seasons: null, weight: 3 },
  zamrud: { name: 'Zamrud', sell: 800, weight: 2 },
  berlian: { name: 'Berlian', sell: 2000, weight: 1 },
};

export const ANIMALS = {
  ayam: { name: 'Ayam', price: 300, product: 'Telur', productSell: 40, feed: 'Pakan Ayam', feedPrice: 15, color: '#f8f9fa' },
  kambing: { name: 'Kambing', price: 900, product: 'Susu Kambing', productSell: 90, feed: 'Rumput', feedPrice: 20, color: '#e9ecef' },
  sapi: { name: 'Sapi', price: 2500, product: 'Susu Sapi', productSell: 180, feed: 'Rumput', feedPrice: 25, color: '#fff3e0' },
  kerbau: { name: 'Kerbau', price: 4000, product: 'Susu Kerbau', productSell: 260, feed: 'Rumput', feedPrice: 30, color: '#6c757d' },
};

export const SHOP = {
  benih: [
    { id: 'benih_lobak', name: 'Benih Lobak', price: 20, desc: 'Panen 2 hari, Semi-Panas-Gugur' },
    { id: 'benih_wortel', name: 'Benih Wortel', price: 35, desc: 'Panen 3 hari, Semi-Panas-Gugur' },
    { id: 'benih_tomat', name: 'Benih Tomat', price: 60, desc: 'Panen 4 hari, Panas-Gugur' },
    { id: 'benih_gandum', name: 'Benih Gandum', price: 45, desc: 'Panen 3 hari, semua musim' },
    { id: 'benih_labu', name: 'Benih Labu', price: 90, desc: 'Panen 5 hari, Gugur-Dingin' },
    { id: 'benih_stroberi', name: 'Benih Stroberi', price: 40, desc: 'Buah manis, panen 3 hari, Semi-Panas' },
  ],
  makanan: [
    { id: 'roti', name: 'Roti', price: 30, desc: 'Lapar +35' },
    { id: 'nasi', name: 'Nasi Goreng', price: 80, desc: 'Lapar +70, Energi +15' },
    { id: 'jus', name: 'Jus Buah', price: 40, desc: 'Haus +60, Energi +10' },
    { id: 'air', name: 'Air Mineral', price: 10, desc: 'Haus +40' },
  ],
  hewan: [
    { id: 'beli_ayam', name: 'Ayam', price: 300, desc: 'Bertelur tiap hari bila diberi pakan' },
    { id: 'beli_kambing', name: 'Kambing', price: 900, desc: 'Susu kambing tiap hari' },
    { id: 'beli_sapi', name: 'Sapi', price: 2500, desc: 'Susu sapi tiap hari' },
    { id: 'beli_kerbau', name: 'Kerbau', price: 4000, desc: 'Susu kerbau tiap hari' },
    { id: 'pakan_ayam', name: 'Pakan Ayam', price: 15, desc: 'Pakan untuk ayam' },
    { id: 'rumput', name: 'Rumput', price: 20, desc: 'Pakan sapi, kambing, kerbau' },
  ],
  obat: [
    { id: 'obat_hewan', name: 'Obat Hewan', price: 120, desc: 'Sembuhkan hewan yang sakit' },
    { id: 'obat_diri', name: 'Obat Herbal', price: 100, desc: 'Sehat +50' },
    { id: 'vitamin', name: 'Vitamin', price: 150, desc: 'Energi +60, Sehat +20' },
  ],
  rumah: [
    { id: 'tanah', name: 'Tanah Ladang +6 petak', price: 8000, desc: 'Perluas ladangmu' },
    { id: 'cincin', name: 'Cincin Lamaran', price: 5000, desc: 'Untuk melamar kekasih' },
    { id: 'rumah_besar', name: 'RUMAH BESAR', price: 50000, desc: 'Beli sebelum akhir Tahun 1 = MENANG!' },
  ],
  lain: [
    { id: 'bunga', name: 'Buket Bunga', price: 50, desc: 'Hadiah untuk penduduk desa' },
    { id: 'pancing_baru', name: 'Pancingan Pro', price: 1500, desc: 'Ikan langka lebih mudah didapat' },
    { id: 'cangkul_baja', name: 'Cangkul Baja', price: 2000, desc: 'Mencangkul 2x lebih cepat' },
  ],
};

// Penduduk desa: id, nama, peran, rumah (miskin/kaya), warna, dialog, bisa dipacari.
export const NPCS = [
  { id: 'tani', name: 'Pak Tani', role: 'Petani Sepuh', house: 'miskin', color: '#8d6e63', hx: 20, hy: 6, lines: ['Dulu ladang ini subur, Nak. Rawat baik-baik.', 'Hujan itu berkah. Tanamanmu tak perlu disiram hari ini.', 'Kalau lapar, makan dulu. Perut kenyang, kerja ringan.'] },
  { id: 'sari', name: 'Bu Sari', role: 'Pedagang Pasar', house: 'sedang', color: '#e07a5f', hx: 26, hy: 6, lines: ['Benih segar, harga bersahabat! Mau beli apa?', 'Hasil panenmu bisa kujualkan. Harga pasar sedang bagus.', 'Festival panen sebentar lagi. Siapkan labu terbaikmu!'] },
  { id: 'rani', name: 'Rani', role: 'Penjual Bunga', house: 'sedang', color: '#f4a7b9', hx: 23, hy: 11, lines: ['Bunga-bunga ini kusiram tiap pagi. Cantik, kan?', 'Aku suka desa ini. Tenang, tapi tidak sepi.', 'Kalau kau memberiku bunga... aku akan sangat senang.'], datable: true, gift: 'bunga' },
  { id: 'dimas', name: 'Dimas', role: 'Saudagar Kaya', house: 'kaya', color: '#3d5a80', hx: 30, hy: 11, lines: ['Rumah besar itu? Harganya 50.000G. Kau mampu?', 'Uang itu alat, Nak. Bukan tujuan. Tapi tetap perlu.', 'Aku dulu juga mulai dari nol. Dari satu petak ladang.'] },
  { id: 'murni', name: 'Nek Murni', role: 'Tetua Desa', house: 'miskin', color: '#9c6644', hx: 17, hy: 11, lines: ['Desa ini sudah ada sebelum kau lahir, Nak.', 'Musim dingin itu keras. Siapkan makanan yang banyak.', 'Anak yang rajin sekolah akan jadi orang besar.'] },
  { id: 'budi', name: 'Budi', role: 'Nelayan', house: 'sedang', color: '#2a9d8f', hx: 35, hy: 5, lines: ['Danau pagi ini tenang. Ikan mas banyak di sana.', 'Laut di selatan dalam. Hiu kecil kadang muncul.', 'Memancing itu sabar. Tarik saat pelampung tenggelam!'] },
  { id: 'kiki', name: 'Kiki', role: 'Anak Desa', house: 'sedang', color: '#f4d35e', hx: 22, hy: 21, lines: ['Ayo main di taman! Ada ayunan dan perosotan!', 'Aku mau jadi dokter hewan kalau sudah besar.', 'Ayahku bilang, hewan itu teman, bukan cuma ternak.'] },
  { id: 'rt', name: 'Pak RT', role: 'Kepala Desa', house: 'kaya', color: '#5a189a', hx: 27, hy: 16, lines: ['Festival desa diadakan tiap akhir musim. Jangan lewatkan!', 'Desa ini maju karena warganya rukun.', 'Ada masalah? Datang saja ke balai desa.'] },
];

export const FESTIVALS = [
  { season: 0, name: 'Festival Bunga Semi', desc: 'Penduduk berkumpul di alun-alun. Semua orang berbagi bunga!' },
  { season: 1, name: 'Lomba Mancing Panas', desc: 'Siapa dapat ikan terbesar hari ini? Hadiah 1.000G!' },
  { season: 2, name: 'Festival Panen Gugur', desc: 'Panen raya! Hasil panen hari ini harganya 2x lipat!' },
  { season: 3, name: 'Festival Salju Dingin', desc: 'Api unggun dan cokelat panas. Desa berkumpul menghangatkan diri.' },
];

export const START_GOLD = 500;
// Modal awal: benih sayur + buah gratis, makanan, pakan, penyiram tanaman,
// dan ember perah. Semua transaksi di game pakai Gold (duit mainan) saja.
export const START_ITEMS = {
  benih_lobak: 5, benih_wortel: 3, benih_stroberi: 3, benih_gandum: 2,
  roti: 2, air: 2, pakan_ayam: 3, rumput: 3, penyiram: 1, ember_perah: 1,
};
