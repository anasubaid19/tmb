import type { GasRow } from "./gas.server";
import { CONTROL_CABANG, CONTROL_SISWA } from "./seed-control.generated";

// ponytail: tanpa DATABASE_URL/POSTGRES_URL, seluruh baca/tulis dialihkan
// ke dataset in-memory ini agar UI bisa dijelajah end-to-end (login, scan,
// nilai, admin).
// Siswa & cabang = data control asli (seed-control.generated.ts); jadwal,
// penguji, denah, config masih mock sampai keputusan tim turun.
// Set kredensial asli di .env untuk data produksi. Tulis mock hilang saat restart.
// Lihat isMockMode di ./mock.

const iso = (ts: number) => new Date(ts).toISOString();

type Db = Record<string, GasRow[]>;
const db: Db = {
  cabang: CONTROL_CABANG,
  // ponytail: kelas sesuai struktur intake riil — Kelas Baru (1/7/10) &
  // Kelas Pindahan (2-5/8/11) per jenjang; AW3 portal hanya SMP & SMA.
  // Sheet real wajib baris yang sama.
  kelas: [
    { id: "K1", cabang_id: "AW3", nama: "Kelas 7", jenjang: "SMP" },
    { id: "K2", cabang_id: "AW3", nama: "Kelas 10", jenjang: "SMA" },
    { id: "K9", cabang_id: "AW3", nama: "Kelas 8", jenjang: "SMP" },
    { id: "K10", cabang_id: "AW3", nama: "Kelas 11", jenjang: "SMA" },
    { id: "K3", cabang_id: "AW1", nama: "Kelas 1", jenjang: "SD" },
    { id: "K11", cabang_id: "AW1", nama: "Kelas 2–5", jenjang: "SD" },
    { id: "K4", cabang_id: "AW1", nama: "Kelas 7", jenjang: "SMP" },
    { id: "K12", cabang_id: "AW1", nama: "Kelas 8", jenjang: "SMP" },
    { id: "K5", cabang_id: "AW1", nama: "Kelas 10", jenjang: "SMA" },
    { id: "K13", cabang_id: "AW1", nama: "Kelas 11", jenjang: "SMA" },
    { id: "K6", cabang_id: "AW4", nama: "Kelas 1", jenjang: "SD" },
    { id: "K14", cabang_id: "AW4", nama: "Kelas 2–5", jenjang: "SD" },
    { id: "K7", cabang_id: "AW4", nama: "Kelas 7", jenjang: "SMP" },
    { id: "K15", cabang_id: "AW4", nama: "Kelas 8", jenjang: "SMP" },
    { id: "K8", cabang_id: "AW4", nama: "Kelas 10", jenjang: "SMA" },
    { id: "K16", cabang_id: "AW4", nama: "Kelas 11", jenjang: "SMA" },
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
      deskripsi: "Calistung untuk SD; Math untuk SMP dan SMA.",
      lembar_key: "mtk",
    },
    {
      id: "M2",
      cabang_id: "",
      nama: "English (Interview)",
      durasi: "45 menit",
      deskripsi:
        "Semua jenjang. Kelas Baru: 1, 7, 10. Kelas Pindahan: 2-5, 8, 11.",
      lembar_key: "ing",
    },
    {
      id: "M3",
      cabang_id: "",
      nama: "Arabic (Interview)",
      durasi: "45 menit",
      deskripsi:
        "Semua jenjang. Kelas Baru: 1, 7, 10. Kelas Pindahan: 2-5, 8, 11.",
      lembar_key: "arb",
    },
    {
      id: "M4",
      cabang_id: "",
      nama: "Al-Qur'an (Tahsin & Hafalan)",
      durasi: "45 menit",
      deskripsi:
        "Semua jenjang. Kelas Baru: 1, 7, 10. Kelas Pindahan: 2-5, 8, 11.",
      lembar_key: "qur",
    },
    {
      id: "M5",
      cabang_id: "",
      nama: "Interview Orangtua",
      durasi: "—",
      deskripsi: "",
      lembar_key: "ort",
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
      sesi: "Sesi 2 (09.15–10.15)",
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
      sesi: "Sesi 2 (09.15–10.15)",
      materi_id: "M4",
      kelas_id: "K2",
      ruang: "B1",
      penguji_id: "P2",
      tampil: "true",
    },
  ],
  // ponytail: skema sesi kanonik (sumber landing umum). cabang_id kosong =
  // global; terisi = override per-cabang (pola config). Nilai = SESI_UJIAN.
  sesi: [
    {
      id: "S1",
      cabang_id: "",
      sesi: "Sesi 1",
      jenjang: "SD",
      waktu: "07.30–08.30",
      tampil: "true",
    },
    {
      id: "S2",
      cabang_id: "",
      sesi: "Sesi 2",
      jenjang: "SMP & SMA (Akhwat)",
      waktu: "09.15–10.15",
      tampil: "true",
    },
    {
      id: "S3",
      cabang_id: "",
      sesi: "Sesi 3",
      jenjang: "SMP & SMA (Ikhwan)",
      waktu: "11.00–12.00",
      tampil: "true",
    },
  ],
  denah: [
    {
      id: "D1",
      cabang_id: "AW3",
      keterangan: "Parkir wali di sisi timur. Peserta masuk via Gerbang Masuk.",
    },
  ],
  penguji: [
    {
      id: "P1",
      kode: "P101",
      nama: "Ahmad Hidayat",
      cabang_id: "AW3",
      materi_id: "M1",
    },
    {
      id: "P2",
      kode: "P102",
      nama: "Siti Rahma",
      cabang_id: "AW3",
      materi_id: "M2",
    },
    {
      id: "P3",
      kode: "P103",
      nama: "Budi Santoso",
      cabang_id: "AW3",
      materi_id: "M3",
    },
  ],
  users: [
    { kode: "P101", role: "penguji", password: "", ref_id: "P1" },
    { kode: "P102", role: "penguji", password: "", ref_id: "P2" },
    { kode: "P103", role: "penguji", password: "", ref_id: "P3" },
    { kode: "SCAN-01", role: "panitia", password: "", ref_id: "" },
    {
      kode: "BAR-01",
      nama: "Barista Kopi",
      role: "barista",
      password: "",
      ref_id: "",
    },
    // Akun admin sungguhan (bukan mock): dipakai lokal maupun produksi.
    // Password dev "admin123" — ganti di sheet users saat produksi.
    {
      kode: "ADMIN-01",
      nama: "Anas Ubaid",
      role: "admin",
      password: "admin123",
      ref_id: "",
    },
    {
      kode: "ADMIN-02",
      nama: "Kemal Prabowo",
      role: "admin",
      password: "admin123",
      ref_id: "",
    },
  ],
  siswa: CONTROL_SISWA,
  kedatangan: [],
  kopi: [],
  config: [
    { id: "1", key: "show_jadwal", value: "true", cabang_id: "" },
    { id: "2", key: "show_kelas", value: "true", cabang_id: "" },
    { id: "3", key: "show_materi", value: "true", cabang_id: "" },
    { id: "4", key: "show_denah", value: "true", cabang_id: "" },
    { id: "5", key: "show_pengumuman", value: "true", cabang_id: "" },
    { id: "6", key: "countdown_enabled", value: "true", cabang_id: "" },
    {
      id: "7",
      key: "countdown_at",
      value: "2026-09-20T07:00:00+07:00",
      cabang_id: "",
    },
    { id: "8", key: "umumkan_hasil", value: "false", cabang_id: "" },
    { id: "9", key: "math_gform_url", value: "", cabang_id: "" },
  ],
  pengumuman: [],
};

/** Dataset seed untuk `scripts/db-seed.ts` (mengisi Postgres produksi).
 * Siswa & cabang = data control asli; sisanya placeholder sampai dirapikan
 * admin lewat CMS. */
export const seedDb: Readonly<Db> = db;

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
  if (!out.ts && table === "kedatangan") out.ts = iso(Date.now());
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
  // ponytail: samakan dengan PG — kolom baru (mis. email/nama) ikut terisi,
  // bukan hanya kolom yang sudah ada di baris mock.
  for (const [k, v] of Object.entries(updates)) found[k] = v;
  return id;
}

export async function mockDelete(table: string, id: string): Promise<string> {
  const rows = db[table] ?? [];
  const key = table === "users" ? "kode" : "id";
  const idx = rows.findIndex((r) => String(r[key] ?? "") === String(id));
  if (idx === -1) throw new Error(`baris tidak ditemukan: ${id}`);
  rows.splice(idx, 1);
  return id;
}
