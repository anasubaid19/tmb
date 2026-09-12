import type { GasRow } from "./gas.server";
import { CONTROL_CABANG, CONTROL_SISWA } from "./seed-control.generated";

// ponytail: tanpa GAS_URL/GAS_TOKEN, seluruh baca/tulis dialihkan ke dataset
// in-memory ini agar UI bisa dijelajah end-to-end (login, scan, nilai, admin).
// Siswa & cabang = data control asli (seed-control.generated.ts); jadwal,
// penguji, denah, config masih mock sampai keputusan tim turun.
// Set kredensial asli di .env untuk data produksi. Tulis mock hilang saat restart.
// Lihat isMockMode di ./mock.

const iso = (ts: number) => new Date(ts).toISOString();

const DENAH_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'>` +
      `<rect width='800' height='500' fill='#f1f5f9'/>` +
      `<rect x='40' y='40' width='200' height='120' fill='#dbeafe' stroke='#2563eb' stroke-width='3'/><text x='140' y='110' text-anchor='middle' font-size='24' fill='#1e3a8a'>RUANG A1</text>` +
      `<rect x='280' y='40' width='200' height='120' fill='#dbeafe' stroke='#2563eb' stroke-width='3'/><text x='380' y='110' text-anchor='middle' font-size='24' fill='#1e3a8a'>RUANG B1</text>` +
      `<rect x='520' y='40' width='240' height='120' fill='#fef3c7' stroke='#d97706' stroke-width='3'/><text x='640' y='110' text-anchor='middle' font-size='24' fill='#92400e'>POSKO</text>` +
      `<rect x='40' y='220' width='330' height='100' fill='#dcfce7' stroke='#16a34a' stroke-width='3'/><text x='205' y='280' text-anchor='middle' font-size='24' fill='#14532d'>GERBANG MASUK</text>` +
      `<rect x='410' y='220' width='350' height='100' fill='#e2e8f0' stroke='#64748b' stroke-width='3'/><text x='585' y='280' text-anchor='middle' font-size='24' fill='#334155'>PARKIR WALI</text>` +
      `<text x='400' y='420' text-anchor='middle' font-size='28' fill='#334155'>Denah Lokasi Ujian — AW3 BSD City</text>` +
      `</svg>`,
  );

type Db = Record<string, GasRow[]>;
const db: Db = {
  cabang: CONTROL_CABANG,
  // ponytail: kelas intake utama (1/7/10) per cabang sesuai data control —
  // AW3 portal hanya SMP (7) & SMA (10). Sheet real wajib baris yang sama.
  kelas: [
    { id: "K1", cabang_id: "AW3", nama: "Kelas 7", jenjang: "SMP" },
    { id: "K2", cabang_id: "AW3", nama: "Kelas 10", jenjang: "SMA" },
    { id: "K3", cabang_id: "AW1", nama: "Kelas 1", jenjang: "SD" },
    { id: "K4", cabang_id: "AW1", nama: "Kelas 7", jenjang: "SMP" },
    { id: "K5", cabang_id: "AW1", nama: "Kelas 10", jenjang: "SMA" },
    { id: "K6", cabang_id: "AW4", nama: "Kelas 1", jenjang: "SD" },
    { id: "K7", cabang_id: "AW4", nama: "Kelas 7", jenjang: "SMP" },
    { id: "K8", cabang_id: "AW4", nama: "Kelas 10", jenjang: "SMA" },
  ],
  // ponytail: 4 materi = 4 baris tes sesuai lembar validasi hal.1
  // (ikuti urutan LEMBAR_TESTS di ./lembar). cabang_id kosong = tampil di
  // semua tab landing karena ujian terpusat di AW3. Sheet real wajib baris
  // + kolom lembar_key yang sama; landing tak membaca lembar_key (internal).
  materi: [
    {
      id: "M1",
      cabang_id: "",
      nama: "Calistung / Math",
      durasi: "60 menit",
      deskripsi: "Membaca, menulis, berhitung, dan logika angka.",
      lembar_key: "mtk",
    },
    {
      id: "M2",
      cabang_id: "",
      nama: "English",
      durasi: "45 menit",
      deskripsi: "Vocabulary, grammar dasar, dan percakapan sederhana.",
      lembar_key: "ing",
    },
    {
      id: "M3",
      cabang_id: "",
      nama: "Arabic",
      durasi: "45 menit",
      deskripsi: "Mufradat, membaca/menulis Arab, dan percakapan sederhana.",
      lembar_key: "arb",
    },
    {
      id: "M4",
      cabang_id: "",
      nama: "Al-Qur'an (Tahsin & Hafalan)",
      durasi: "45 menit",
      deskripsi: "Kemampuan baca Al-Qur'an (tahsin) dan hafalan juz amma.",
      lembar_key: "qur",
    },
  ],
  jadwal: [
    {
      id: "J1",
      cabang_id: "AW3",
      tanggal: "Ahad, 20 Sep 2026",
      sesi: "Sesi 1 (07.30–08.30)",
      materi_id: "M1",
      kelas_id: "K1",
      ruang: "A1",
      penguji_id: "P1",
      tampil: "true",
    },
    {
      id: "J2",
      cabang_id: "AW3",
      tanggal: "Ahad, 20 Sep 2026",
      sesi: "Sesi 1 (07.30–08.30)",
      materi_id: "M2",
      kelas_id: "K2",
      ruang: "B1",
      penguji_id: "P2",
      tampil: "true",
    },
    {
      id: "J3",
      cabang_id: "AW3",
      tanggal: "Ahad, 20 Sep 2026",
      sesi: "Sesi 2 (09.00–10.00)",
      materi_id: "M3",
      kelas_id: "K1",
      ruang: "A1",
      penguji_id: "P1",
      tampil: "true",
    },
    {
      id: "J4",
      cabang_id: "AW3",
      tanggal: "Ahad, 20 Sep 2026",
      sesi: "Sesi 2 (09.00–10.00)",
      materi_id: "M4",
      kelas_id: "K2",
      ruang: "B1",
      penguji_id: "P2",
      tampil: "true",
    },
  ],
  denah: [
    {
      id: "D1",
      cabang_id: "AW3",
      judul: "Denah Gedung Ujian",
      image_url: DENAH_SVG,
      keterangan: "Parkir wali di sisi timur. Peserta masuk via Gerbang Masuk.",
    },
  ],
  penguji: [
    {
      id: "P1",
      kode: "P101",
      nama: "Ahmad Hidayat",
      cabang_id: "AW3",
      kontak: "081200000101",
    },
    {
      id: "P2",
      kode: "P102",
      nama: "Siti Rahma",
      cabang_id: "AW3",
      kontak: "081200000102",
    },
    {
      id: "P3",
      kode: "P103",
      nama: "Budi Santoso",
      cabang_id: "AW3",
      kontak: "081200000103",
    },
  ],
  users: [
    { kode: "P101", role: "penguji", password_hash: "", ref_id: "P1" },
    { kode: "P102", role: "penguji", password_hash: "", ref_id: "P2" },
    { kode: "P103", role: "penguji", password_hash: "", ref_id: "P3" },
    { kode: "SCAN-01", role: "panitia", password_hash: "", ref_id: "" },
    // Akun admin sungguhan (bukan mock): dipakai lokal maupun produksi.
    // Saat ship, tempel baris yang sama (nama + password_hash) ke sheet users.
    {
      kode: "ADMIN-01",
      nama: "Anas Ubaid",
      role: "admin",
      password_hash:
        "scrypt$2c75e516fff0660df20151bbf49dd58a$7d24e11db1ddfc11ae1e6e53c4c4f23ee2ee591246fd24f32cd0997715b261e4",
      ref_id: "",
    },
    {
      kode: "ADMIN-02",
      nama: "Kemal Prabowo",
      role: "admin",
      password_hash:
        "scrypt$939e165ca355e2aee4fa3f4824bcfffb$1403b72f0812efb2a0c686f638286ce554798fe032f72c69f93d26b3bde0fd30",
      ref_id: "",
    },
  ],
  siswa: CONTROL_SISWA,
  kedatangan: [],
  nilai: [],
  config: [
    { id: "1", key: "show_jadwal", value: "true", cabang_id: "" },
    { id: "2", key: "show_kelas", value: "true", cabang_id: "" },
    { id: "3", key: "show_materi", value: "true", cabang_id: "" },
    { id: "4", key: "show_denah", value: "true", cabang_id: "" },
    { id: "5", key: "show_penguji", value: "true", cabang_id: "" },
    { id: "6", key: "show_pengumuman", value: "true", cabang_id: "" },
    { id: "7", key: "countdown_enabled", value: "true", cabang_id: "" },
    {
      id: "8",
      key: "countdown_at",
      value: "2026-09-20T07:00:00+07:00",
      cabang_id: "",
    },
    { id: "9", key: "umumkan_hasil", value: "false", cabang_id: "" },
  ],
  pengumuman: [],
};

function match(row: GasRow, q?: Record<string, string>): boolean {
  if (!q) return true;
  return Object.entries(q).every(
    ([k, v]) => String(row[k] ?? "") === String(v),
  );
}

export async function mockRead(
  table: string,
  q?: Record<string, string>,
): Promise<GasRow[]> {
  return (db[table] ?? []).filter((r) => match(r, q)).map((r) => ({ ...r }));
}

export async function mockAppend(table: string, row: GasRow): Promise<GasRow> {
  if (!db[table]) db[table] = [];
  const rows = db[table] as GasRow[];
  const out: GasRow = { ...row };
  // Samakan GAS: auto id numerik bila kosong (kecuali users berkunci kode),
  // auto ts untuk tabel berkolom ts.
  if (!out.id && table !== "users") {
    const max = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
    out.id = String(max + 1);
  }
  if (!out.ts && (table === "nilai" || table === "kedatangan"))
    out.ts = iso(Date.now());
  rows.push(out);
  return { ...out };
}

export async function mockUpdate(
  table: string,
  id: string,
  updates: GasRow,
): Promise<string> {
  const rows = db[table] ?? [];
  const key = table === "users" ? "kode" : "id";
  const found = rows.find((r) => String(r[key] ?? "") === String(id));
  if (!found) throw new Error(`baris tidak ditemukan: ${id}`);
  for (const [k, v] of Object.entries(updates)) {
    if (k in found) found[k] = v;
  }
  return id;
}
