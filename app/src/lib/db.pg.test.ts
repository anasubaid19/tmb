import { afterAll, expect, test } from "bun:test";
import { dbAppend, dbAppendMany, getPool, migrateAppSchema } from "./db.server";

/**
 * Bug yang diuji di sini khas Postgres dan TIDAK terlihat di mock in-memory
 * (mockAppend menghitung max di JS, tanpa SQL). Karena itu file ini hanya
 * berjalan bila diarahkan eksplisit ke database uji — `bun test` biasa
 * melewatinya, dan DATABASE_URL produksi tidak pernah ikut terpakai.
 *
 *   createdb tmb_test && TMB_TEST_DATABASE_URL=postgres://…@127.0.0.1/tmb_test bun test
 */
const TEST_DB = process.env.TMB_TEST_DATABASE_URL ?? "";
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

// ponytail: tanpa DB uji, semua tes di file ini di-skip (bukan gagal).
const it = TEST_DB ? test : test.skip;

const created: { table: string; id: string }[] = [];

async function bersihkan() {
  if (!TEST_DB) return;
  const pool = getPool();
  for (const row of created) {
    await pool.query(`DELETE FROM "${row.table}" WHERE id = $1`, [row.id]);
  }
  await pool.end();
}

afterAll(bersihkan);

/**
 * Inti bug produksi: `FOR UPDATE` ilegal bersama agregat (MAX) di Postgres.
 * Jalur ini hanya terpicu saat append TANPA id — mis. setConfigFn membuat
 * baris `uji_cabang` pertama untuk sebuah cabang.
 */
it("append tanpa id mengalokasikan id numerik", async () => {
  await migrateAppSchema(getPool());
  const row = await dbAppend("config", {
    key: "uji_cabang",
    value: "false",
    cabang_id: "AW3",
  });
  created.push({ table: "config", id: String(row.id) });
  expect(String(row.id)).toMatch(/^\d+$/);
  expect(row.key).toBe("uji_cabang");
  expect(row.value).toBe("false");
});

it("append tanpa id jalan di semua tabel yang terdampak", async () => {
  await migrateAppSchema(getPool());
  const iso = new Date().toISOString();
  const kasus: [string, Record<string, string>][] = [
    [
      "kedatangan",
      { kode_terdata: "TMB-TEST-1", tipe: "siswa", waktu: iso, oleh: "tes" },
    ],
    [
      "siswa",
      {
        kode: "AW3-B999",
        nama: "Uji Debug",
        cabang_id: "AW3",
        jenjang: "SMP",
        status_ujian: "belum",
      },
    ],
    [
      "jadwal",
      {
        cabang_id: "AW3",
        tanggal: "Ahad",
        sesi: "Sesi 1",
        materi_id: "M1",
        kelas_id: "K1",
        ruang: "A1",
        penguji_id: "P1",
        tampil: "true",
      },
    ],
    [
      "sesi",
      {
        cabang_id: "AW3",
        sesi: "Sesi 9",
        jenjang: "SD",
        waktu: "07.00–08.00",
        tampil: "true",
      },
    ],
    [
      "penguji",
      { kode: "P999", nama: "Penguji Uji", cabang_id: "AW3", materi_id: "M1" },
    ],
    [
      "pengumuman",
      { siswa_id: "TMB-TEST-1", cabang_id: "AW3", status: "lulus" },
    ],
    [
      "lembar",
      {
        siswa_id: "TMB-TEST-1",
        diisi_oleh: "",
        nama_pengelola: "",
        foto_paths: "[]",
        ts: iso,
      },
    ],
  ];
  for (const [table, row] of kasus) {
    const out = await dbAppend(table, row);
    created.push({ table, id: String(out.id) });
    expect(String(out.id)).toMatch(/^\d+$/);
  }
});

it("appendMany mengisi kolom id (jalur impor pengumuman)", async () => {
  await migrateAppSchema(getPool());
  const inserted = await dbAppendMany("pengumuman", [
    {
      siswa_id: "",
      cabang_id: "AW3",
      status: "lulus",
      nama: "Uji Banyak A",
      jenjang: "SMP",
      kelas: "9",
      remarks: "",
    },
    {
      siswa_id: "",
      cabang_id: "AW3",
      status: "lulus",
      nama: "Uji Banyak B",
      jenjang: "SD",
      kelas: "6",
      remarks: "",
    },
  ]);
  expect(inserted).toBe(2);
  const out = await getPool().query(
    `SELECT id FROM "pengumuman" WHERE nama IN ($1, $2) ORDER BY id`,
    ["Uji Banyak A", "Uji Banyak B"],
  );
  expect(out.rows.length).toBe(2);
  for (const row of out.rows) {
    created.push({ table: "pengumuman", id: String(row.id) });
    expect(String(row.id)).toMatch(/^\d+$/);
  }
});

it("append paralel tidak menghasilkan id kembar", async () => {
  await migrateAppSchema(getPool());
  const rows = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      dbAppend("config", {
        key: "uji_cabang",
        value: "false",
        cabang_id: `TMB-RACE-${i}`,
      }),
    ),
  );
  for (const row of rows) created.push({ table: "config", id: String(row.id) });
  const ids = rows.map((row) => String(row.id));
  expect(new Set(ids).size).toBe(ids.length);
});
