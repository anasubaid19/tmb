import type { GasRow } from "./gas.server";

// ponytail: tanpa GAS_URL/GAS_TOKEN, seluruh baca/tulis dialihkan ke dataset
// in-memory ini agar UI bisa dijelajah end-to-end (login, scan, nilai, admin).
// Set kredensial asli di .env untuk data produksi. Tulis mock hilang saat restart.
// Lihat isMockMode di ./mock.

const H = 3600_000;
const now = Date.now();
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
  cabang: [
    {
      id: "AW1",
      nama: "Al-Wildan 1 Gading Serpong",
      portal: "false",
      alamat: "Gading Serpong, Tangerang",
      program: "SD (Ikhwan/Akhwat) · SMP (Akhwat) · SMA (Akhwat)",
      landing: "true",
    },
    {
      id: "AW3",
      nama: "Al-Wildan 3 BSD City",
      portal: "true",
      alamat: "Jl. BSD Raya, Tangerang Selatan",
      program: "SMP (Ikhwan) · SMA (Ikhwan)",
      landing: "true",
    },
    {
      id: "AW4",
      nama: "Al-Wildan 4 Jakarta",
      portal: "false",
      alamat: "Jakarta",
      program: "SD (Ikhwan/Akhwat) · SMP (Ikhwan/Akhwat) · SMA (Ikhwan/Akhwat)",
      landing: "true",
    },
  ],
  kelas: [
    { id: "K1", cabang_id: "AW3", nama: "Kelas 1", jenjang: "SD" },
    { id: "K2", cabang_id: "AW3", nama: "Kelas 2", jenjang: "SD" },
    { id: "K3", cabang_id: "AW3", nama: "Kelas 3", jenjang: "SD" },
  ],
  materi: [
    {
      id: "M1",
      cabang_id: "AW3",
      nama: "Matematika",
      durasi: "60 menit",
      deskripsi: "Berhitung, logika angka, dan soal cerita.",
    },
    {
      id: "M2",
      cabang_id: "AW3",
      nama: "IPA",
      durasi: "45 menit",
      deskripsi: "Makhluk hidup, benda, dan lingkungan sekitar.",
    },
    {
      id: "M3",
      cabang_id: "AW3",
      nama: "B. Indonesia",
      durasi: "45 menit",
      deskripsi: "Membaca, menulis, dan pemahaman bacaan.",
    },
    {
      id: "M4",
      cabang_id: "AW3",
      nama: "B. Inggris",
      durasi: "30 menit",
      deskripsi: "Vocabulary dasar dan percakapan sederhana.",
    },
    {
      id: "M5",
      cabang_id: "AW3",
      nama: "PAI",
      durasi: "30 menit",
      deskripsi: "Hafalan doa harian dan akhlak.",
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
    },
    {
      id: "J2",
      cabang_id: "AW3",
      tanggal: "Ahad, 20 Sep 2026",
      sesi: "Sesi 2 (09.00–10.00)",
      materi_id: "M2",
      kelas_id: "K1",
      ruang: "A1",
      penguji_id: "P1",
    },
    {
      id: "J3",
      cabang_id: "AW3",
      tanggal: "Ahad, 20 Sep 2026",
      sesi: "Sesi 1 (07.30–08.30)",
      materi_id: "M4",
      kelas_id: "K2",
      ruang: "B1",
      penguji_id: "P2",
    },
    {
      id: "J4",
      cabang_id: "AW3",
      tanggal: "Ahad, 20 Sep 2026",
      sesi: "Sesi 3 (11.00–12.00)",
      materi_id: "M3",
      kelas_id: "K3",
      ruang: "B2",
      penguji_id: "P3",
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
    { kode: "ADMIN-01", role: "admin", password_hash: "MOCK", ref_id: "" },
  ],
  siswa: [
    {
      id: "1",
      kode: "AW4-A001",
      nama: "Aisyah Putri",
      cabang_id: "AW4",
      jenjang: "SD",
      kelas_tujuan: "1",
      asal_sekolah: "TK Pelita",
      no_hp_wali: "081234567801",
      email: "aisyah.putri@gmail.com",
      jenis_kelamin: "PEREMPUAN",
      program: "FULLDAY",
      peminatan: "INTER",
      status_ujian: "belum",
    },
    {
      id: "2",
      kode: "AW4-A002",
      nama: "Muhammad Faqih",
      cabang_id: "AW4",
      jenjang: "SD",
      kelas_tujuan: "1",
      asal_sekolah: "TK An-Nur",
      no_hp_wali: "081234567802",
      email: "faqih@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "BOARDING",
      peminatan: "AE",
      status_ujian: "belum",
    },
    {
      id: "3",
      kode: "AW4-A003",
      nama: "Khadijah Zahra",
      cabang_id: "AW4",
      jenjang: "SD",
      kelas_tujuan: "2",
      asal_sekolah: "SDN 01 Pagi",
      no_hp_wali: "081234567803",
      email: "zahra@gmail.com",
      jenis_kelamin: "PEREMPUAN",
      program: "FULLDAY",
      peminatan: "INTER",
      status_ujian: "belum",
    },
    {
      id: "4",
      kode: "AW4-A004",
      nama: "Abdullah Hanif",
      cabang_id: "AW4",
      jenjang: "SD",
      kelas_tujuan: "2",
      asal_sekolah: "SDN 02 Pagi",
      no_hp_wali: "081234567804",
      email: "hanif@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "FULLDAY",
      peminatan: "AE",
      status_ujian: "selesai",
    },
    {
      id: "5",
      kode: "AW4-A005",
      nama: "Fatimah Azzahra",
      cabang_id: "AW4",
      jenjang: "SD",
      kelas_tujuan: "3",
      asal_sekolah: "SDIT Cahaya",
      no_hp_wali: "081234567805",
      email: "fatimah@gmail.com",
      jenis_kelamin: "PEREMPUAN",
      program: "BOARDING",
      peminatan: "INTER",
      status_ujian: "selesai",
    },
    {
      id: "6",
      kode: "AW4-A006",
      nama: "Yusuf Maulana",
      cabang_id: "AW4",
      jenjang: "SD",
      kelas_tujuan: "3",
      asal_sekolah: "SDN 03 Pagi",
      no_hp_wali: "081234567806",
      email: "yusuf@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "FULLDAY",
      peminatan: "MQ",
      status_ujian: "selesai",
    },
    {
      id: "7",
      kode: "AW4-A007",
      nama: "Maryam Salsabila",
      cabang_id: "AW4",
      jenjang: "SD",
      kelas_tujuan: "1",
      asal_sekolah: "TK Bintang",
      no_hp_wali: "081234567807",
      email: "maryam@gmail.com",
      jenis_kelamin: "PEREMPUAN",
      program: "FULLDAY",
      peminatan: "INTER",
      status_ujian: "belum",
    },
    {
      id: "8",
      kode: "AW1-A001",
      nama: "Ali Rahman",
      cabang_id: "AW1",
      jenjang: "SD",
      kelas_tujuan: "1",
      asal_sekolah: "TK Mutiara",
      no_hp_wali: "081234567808",
      email: "ali@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "FULLDAY",
      peminatan: "AE",
      status_ujian: "belum",
    },
    {
      id: "9",
      kode: "AW1-A002",
      nama: "Zaidan Malik",
      cabang_id: "AW1",
      jenjang: "SD",
      kelas_tujuan: "2",
      asal_sekolah: "SDN 05 Pagi",
      no_hp_wali: "081234567809",
      email: "zaidan@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "FULLDAY",
      peminatan: "INTER",
      status_ujian: "belum",
    },
    {
      id: "10",
      kode: "AW4-A008",
      nama: "Hafidz Alfarizi",
      cabang_id: "AW4",
      jenjang: "SD",
      kelas_tujuan: "1",
      asal_sekolah: "TK Firdaus",
      no_hp_wali: "081234567810",
      email: "hafidz@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "BOARDING",
      peminatan: "DI",
      status_ujian: "belum",
    },
    {
      id: "11",
      kode: "AW1-A003",
      nama: "Ahmad Putra",
      cabang_id: "AW1",
      jenjang: "SD",
      kelas_tujuan: "1",
      asal_sekolah: "TK Pelita",
      no_hp_wali: "081234567801",
      email: "aisyah.putri@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "FULLDAY",
      peminatan: "INTER",
      status_ujian: "belum",
    },
    {
      id: "12",
      kode: "AW1-K001",
      nama: "Nur Aini",
      cabang_id: "AW1",
      jenjang: "TK-A",
      kelas_tujuan: "TK-A",
      asal_sekolah: "PG Al-Wildan",
      no_hp_wali: "081234567811",
      email: "nuraini@gmail.com",
      jenis_kelamin: "PEREMPUAN",
      program: "FULLDAY",
      peminatan: "",
      status_ujian: "belum",
    },
    {
      id: "13",
      kode: "AW3-B001",
      nama: "Bilal Hidayat",
      cabang_id: "AW3",
      jenjang: "SMP",
      kelas_tujuan: "7",
      asal_sekolah: "SDIT An-Najah",
      no_hp_wali: "081234567812",
      email: "bilal@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "BOARDING",
      peminatan: "AE",
      status_ujian: "belum",
    },
    {
      id: "14",
      kode: "AW3-C001",
      nama: "Umar Faruq",
      cabang_id: "AW3",
      jenjang: "SMA",
      kelas_tujuan: "10",
      asal_sekolah: "SMPIT Al-Falah",
      no_hp_wali: "081234567813",
      email: "umar@gmail.com",
      jenis_kelamin: "LAKI-LAKI",
      program: "FULLDAY",
      peminatan: "MQ",
      status_ujian: "belum",
    },
  ],
  kedatangan: [
    {
      id: "1",
      kode_terdata: "AW4-A001",
      tipe: "siswa",
      waktu: iso(now - 25 * 60_000),
      oleh: "SCAN-01",
    },
    {
      id: "2",
      kode_terdata: "AW4-A002",
      tipe: "siswa",
      waktu: iso(now - 48 * 60_000),
      oleh: "SCAN-01",
    },
    {
      id: "3",
      kode_terdata: "AW4-A003",
      tipe: "siswa",
      waktu: iso(now - 70 * 60_000),
      oleh: "SCAN-01",
    },
    {
      id: "4",
      kode_terdata: "P101",
      tipe: "penguji",
      waktu: iso(now - 90 * 60_000),
      oleh: "SCAN-01",
    },
    {
      id: "5",
      kode_terdata: "AW4-A006",
      tipe: "siswa",
      waktu: iso(now - 110 * 60_000),
      oleh: "SCAN-01",
    },
  ],
  nilai: [
    {
      id: "1",
      siswa_id: "4",
      jadwal_id: "J1",
      materi_id: "M1",
      skor: "85",
      catatan: "Bagus",
      foto_path: "",
      diisi_oleh: "P101",
      ts: iso(now - 26 * H),
    },
    {
      id: "2",
      siswa_id: "4",
      jadwal_id: "J2",
      materi_id: "M2",
      skor: "78",
      catatan: "",
      foto_path: "",
      diisi_oleh: "P101",
      ts: iso(now - 26 * H),
    },
    {
      id: "3",
      siswa_id: "5",
      jadwal_id: "J1",
      materi_id: "M1",
      skor: "92",
      catatan: "Sangat baik",
      foto_path: "",
      diisi_oleh: "P101",
      ts: iso(now - 26 * H),
    },
    {
      id: "4",
      siswa_id: "5",
      jadwal_id: "J2",
      materi_id: "M2",
      skor: "88",
      catatan: "",
      foto_path: "",
      diisi_oleh: "P101",
      ts: iso(now - 26 * H),
    },
    {
      id: "5",
      siswa_id: "6",
      jadwal_id: "J1",
      materi_id: "M1",
      skor: "55",
      catatan: "Perlu bimbingan",
      foto_path: "",
      diisi_oleh: "P101",
      ts: iso(now - 26 * H),
    },
  ],
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
  pengumuman: [
    { id: "1", siswa_id: "4", cabang_id: "AW4", status: "lulus" },
    { id: "2", siswa_id: "5", cabang_id: "AW4", status: "lulus" },
    { id: "3", siswa_id: "6", cabang_id: "AW4", status: "tidak_lulus" },
  ],
};

let adminHash: string | null = null;
async function getAdminHash(): Promise<string> {
  if (!adminHash) {
    const { hashPassword } = await import("./password.server");
    adminHash = await hashPassword("admin123");
  }
  return adminHash;
}

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
  const rows = (db[table] ?? [])
    .filter((r) => match(r, q))
    .map((r) => ({ ...r }));
  if (table === "users") {
    const hash = await getAdminHash();
    for (const r of rows) if (r.role === "admin") r.password_hash = hash;
  }
  return rows;
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
