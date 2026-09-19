/**
 * Bersihkan jejak uji paraf interview orang tua (M5) di produksi.
 *
 * Ditulis setelah reproduksi bug "paraf interview menampilkan penguji lain":
 * dua siswa berikut diisi saat uji, lalu dikosongkan lagi. Guard nilai
 * memastikan hanya menyentuh baris yang memang dari sesi uji ini.
 *
 * Pakai:
 *   bun scripts/reset-uji-ortu.ts          # dry-run (default, tak mengubah)
 *   bun scripts/reset-uji-ortu.ts --apply  # benar-benar menulis
 *
 * Jalankan di VPS (butuh DATABASE_URL).
 */

import {
  dbRead,
  dbUpdate,
  getPool,
  isDatabaseConfigured,
} from "../src/lib/db.server";

const APPLY = process.argv.includes("--apply");

/** kode siswa → { kolom: nilaiHarus, kolomYangDikosongkan }. */
const TARGETS: Record<
  string,
  { harus: Record<string, string>; kosongkan: string[] }
> = {
  // Diisi 5 aspek (4,4,4,4,4 → total 20) sebagai Abdul Hadi (P-030).
  "AWI-162": {
    harus: { nilai_ortu_total: "20", nilai_ortu_oleh: "P-030" },
    kosongkan: [
      "nilai_ortu_ibadah",
      "nilai_ortu_akhlak",
      "nilai_ortu_polaasuh",
      "nilai_ortu_belajar",
      "nilai_ortu_gadget",
      "nilai_ortu_total",
      "nilai_ortu_oleh",
    ],
  },
  // Hanya catatan yang diisi (bukti bug: _oleh tak ikut tersimpan).
  "AWI-023": {
    harus: { nilai_ortu: "Tes catatan paraf" },
    kosongkan: ["nilai_ortu"],
  },
};

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL tidak terpasang — jalankan di VPS tempat produksi.",
    );
  }
  console.log(APPLY ? "MODE: APPLY (menulis)" : "MODE: DRY-RUN (tanpa tulis)");

  for (const [kode, { harus, kosongkan }] of Object.entries(TARGETS)) {
    const row = (await dbRead("siswa", { kode }))[0];
    if (!row) {
      console.log(`- ${kode}: siswa tidak ditemukan — lewati.`);
      continue;
    }
    const cocok = Object.entries(harus).every(
      ([kolom, nilai]) => String(row[kolom] ?? "").trim() === nilai,
    );
    if (!cocok) {
      const kini = Object.keys(harus)
        .map((k) => `${k}="${String(row[k] ?? "").trim()}"`)
        .join(", ");
      console.log(
        `- ${kode}: dilewati (${kini}, bukan jejak uji ini) — data sudah berubah.`,
      );
      continue;
    }
    console.log(`- ${kode} (id ${row.id}): kosongkan ${kosongkan.join(", ")}`);
    if (APPLY) {
      await dbUpdate(
        "siswa",
        String(row.id),
        Object.fromEntries(kosongkan.map((k) => [k, ""])),
      );
    }
  }

  console.log(APPLY ? "Selesai." : "Dry-run selesai — ulangi dengan --apply.");
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  if (isDatabaseConfigured()) await getPool().end();
}
