/**
 * Pembersihan terarah jejak uji paraf di produksi — HANYA kolom yang ditulis
 * saat tes, bukan seluruh nilai siswa (beda dengan tombol "Hapus nilai" di CMS
 * yang mengosongkan semua kolom nilai).
 *
 * Pakai:
 *   bun scripts/reset-uji-paraf.ts          # dry-run (default, tak mengubah)
 *   bun scripts/reset-uji-paraf.ts --apply  # benar-benar menulis
 *
 * Jalankan di VPS (butuh DATABASE_URL). Aman bila data sudah berubah: guard
 * kode penilai memastikan hanya menyentuh baris yang memang dari sesi uji ini.
 */

import {
  dbRead,
  dbUpdate,
  getPool,
  isDatabaseConfigured,
} from "../src/lib/db.server";
import { dbColumns } from "../src/lib/db-schema";

const APPLY = process.argv.includes("--apply");

/** kode siswa → { penilaiHarus, kolomYangDikosongkan }. */
const TARGETS: Record<string, { oleh: string; kolom: readonly string[] }> = {
  // Arabic awalnya KOSONG; tes mengisi 86 + 4 aspek → kosongkan semua nilai_arabic*.
  "AWI-162": {
    oleh: "P-065",
    kolom: dbColumns("siswa").filter((c) => c.startsWith("nilai_arabic")),
  },
  // Arabic sudah ada (100) sebelum tes; tes hanya menimpa _oleh → kembalikan kosong.
  "AWI-131": { oleh: "P-050", kolom: ["nilai_arabic_oleh"] },
};

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL tidak terpasang — jalankan di VPS tempat produksi.",
    );
  }
  console.log(APPLY ? "MODE: APPLY (menulis)" : "MODE: DRY-RUN (tanpa tulis)");

  for (const [kode, { oleh, kolom }] of Object.entries(TARGETS)) {
    const row = (await dbRead("siswa", { kode }))[0];
    if (!row) {
      console.log(`- ${kode}: siswa tidak ditemukan — lewati.`);
      continue;
    }
    const olehSekarang = String(row.nilai_arabic_oleh ?? "").trim();
    if (olehSekarang !== oleh) {
      console.log(
        `- ${kode}: dilewati (nilai_arabic_oleh="${olehSekarang}", bukan "${oleh}") — data sudah berubah.`,
      );
      continue;
    }
    const updates: Record<string, string> = {};
    for (const c of kolom) updates[c] = "";
    console.log(`- ${kode} (id ${row.id}): kosongkan ${kolom.join(", ")}`);
    if (APPLY) await dbUpdate("siswa", String(row.id), updates);
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
