/**
 * Isi database Postgres dari dataset seed di repo (`src/lib/seed.ts`) —
 * cabang, users/admin, kelas, materi, sesi, jadwal, penguji, denah, config,
 * dan siswa. Idempoten: baris yang id/kode-nya sudah ada dilewati, jadi aman
 * dijalankan berulang.
 *
 * Jalankan di server (image sudah meng-COPY scripts/ + src/):
 *   docker compose exec tmb bun scripts/db-seed.ts
 *   docker compose exec tmb bun scripts/db-seed.ts --only=cabang,users
 *
 * ponytail: script BERHENTI bila DATABASE_URL kosong — dbTransaction akan
 * diam-diam memakai mock in-memory dan "sukses" tanpa menulis apa pun.
 */
import { dbTransaction, isDatabaseConfigured } from "../src/lib/db.server";
import { DB_TABLES, type DbTable, dbKey } from "../src/lib/db-schema";
import { seedDb } from "../src/lib/seed";

if (!isDatabaseConfigured()) {
  console.error(
    "DATABASE_URL belum diisi. Script ini hanya untuk database nyata;\n" +
      "tanpa itu aplikasi memakai data mock in-memory.",
  );
  process.exit(1);
}

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

const tables = (Object.keys(DB_TABLES) as DbTable[]).filter(
  (t) => !only || only.has(t),
);

const summary = await dbTransaction(async (tx) => {
  const out: { table: string; added: number; skipped: number }[] = [];
  for (const table of tables) {
    const data = seedDb[table] ?? [];
    if (data.length === 0) continue;
    const key = dbKey(table);
    const existing = new Set(
      (await tx.read(table)).map((r) => String(r[key] ?? "")),
    );
    let added = 0;
    let skipped = 0;
    for (const row of data) {
      const id = String(row[key] ?? "");
      if (!id || existing.has(id)) {
        skipped += 1;
        continue;
      }
      await tx.append(table, row);
      existing.add(id);
      added += 1;
    }
    out.push({ table, added, skipped });
  }
  return out;
});

for (const r of summary) {
  console.log(`${r.table.padEnd(12)} +${r.added} ditambah, ${r.skipped} dilewati`);
}
const total = summary.reduce((n, r) => n + r.added, 0);
console.log(`\nseed selesai: ${total} baris baru.`);