/**
 * Skema tabel aplikasi PostgreSQL — cermin 1:1 dari SCHEMA GAS.
 *
 * Data auth/sesi Better Auth memakai tabel inti Better Auth (`user`,
 * `session`, `account`, `verification`) yang dibuat lewat migrasi Better Auth,
 * bukan modul ini. Tabel `users` di bawah adalah tabel staf lama (kode).
 */
export const DB_TABLES = {
  cabang: ["id", "nama", "portal", "alamat", "program", "landing"],
  kelas: ["id", "cabang_id", "nama", "jenjang"],
  materi: ["id", "cabang_id", "nama", "durasi", "deskripsi", "lembar_key"],
  jadwal: [
    "id",
    "cabang_id",
    "tanggal",
    "sesi",
    "materi_id",
    "kelas_id",
    "ruang",
    "penguji_id",
    "tampil",
  ],
  sesi: ["id", "cabang_id", "sesi", "jenjang", "waktu", "tampil"],
  denah: ["id", "cabang_id", "keterangan"],
  penguji: ["id", "kode", "nama", "cabang_id", "materi_id"],
  siswa: [
    "id",
    "kode",
    "nama",
    "cabang_id",
    "jenjang",
    "kelas_tujuan",
    "no_hp_wali",
    "email",
    "jenis_kelamin",
    "program_jurusan",
    "status_ujian",
    "nilai_calistung_math",
    "nilai_english",
    "nilai_arabic",
    "nilai_quran",
    "nilai_ortu",
    // ponytail: penugasan ruang per siswa (NEW-DATA pivot) — tampil di
    // dashboard siswa; kosong = belum ada penugasan.
    "ruang_tes",
    "lantai_tes",
    "ruang_ortu",
    "lantai_ortu",
    "sesi",
    "pukul",
    "tanggal",
  ],
  users: ["kode", "nama", "role", "password", "ref_id"],
  config: ["id", "key", "value", "cabang_id"],
  kedatangan: ["id", "kode_terdata", "tipe", "waktu", "oleh"],
  pengumuman: ["id", "siswa_id", "cabang_id", "status"],
  lembar: [
    "id",
    "siswa_id",
    "diisi_oleh",
    "nama_pengelola",
    "foto_paths",
    "ts",
  ],
} as const;

export type DbTable = keyof typeof DB_TABLES;
export type DbRow = Record<string, string | number | boolean | null>;

/** Kunci pencocokan tulis — sama dengan perilaku GAS (id, kecuali users). */
export function dbKey(table: DbTable): "id" | "kode" {
  return table === "users" ? "kode" : "id";
}

export function isDbTable(table: string): table is DbTable {
  return table in DB_TABLES;
}

export function dbColumns(table: DbTable): readonly string[] {
  return DB_TABLES[table];
}
