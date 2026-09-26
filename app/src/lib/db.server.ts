import { Kysely, PostgresDialect } from "kysely";
import { Pool, type PoolClient } from "pg";
import {
  DB_TABLES,
  type DbRow,
  type DbTable,
  dbColumns,
  dbKey,
  isDbTable,
} from "./db-schema";
import {
  mockAppend,
  mockDelete,
  mockDeleteAll,
  mockRead,
  mockUpdate,
} from "./seed";

// ponytail: satu pool per proses, dipakai CRUD aplikasi + Kysely Better Auth.
// Tanpa DATABASE_URL/POSTGRES_URL, CRUD jatuh ke mock in-memory agar test/UI
// tetap jalan; Better Auth tetap butuh DB nyata (lihat auth-server.ts).
let pool: Pool | null = null;
let authDb: Kysely<Record<string, never>> | null = null;

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
}

export function isDatabaseConfigured(): boolean {
  return databaseUrl().length > 0;
}

/** Status sumber data untuk badge admin — tanpa mengekspos kredensial. */
export function dbStatus(): {
  connected: boolean;
  source: "postgres" | "none";
  url: string;
  tokenMasked: string;
} {
  const connected = isDatabaseConfigured();
  return {
    connected,
    source: connected ? "postgres" : "none",
    url: "",
    tokenMasked: "",
  };
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = databaseUrl();
    if (!connectionString)
      throw new Error("DATABASE_URL/POSTGRES_URL belum diisi");
    pool = new Pool({ connectionString });
  }
  return pool;
}

export function getAuthDb(): Kysely<Record<string, never>> {
  if (!authDb) {
    authDb = new Kysely<Record<string, never>>({
      dialect: new PostgresDialect({ pool: getPool() }),
    });
  }
  return authDb;
}

const ident = (name: string): string => `"${name.replace(/"/g, '""')}"`;

function tableOrThrow(table: string): DbTable {
  if (!isDbTable(table)) throw new Error(`tabel tidak dikenal: ${table}`);
  return table;
}

function cleanRow(table: DbTable, row: DbRow): DbRow {
  const columns = dbColumns(table);
  const out: DbRow = {};
  for (const column of columns) {
    if (row[column] !== undefined) out[column] = row[column] ?? "";
  }
  return out;
}

async function pgRead(
  client: Pool | PoolClient,
  table: DbTable,
  q?: Record<string, string>,
): Promise<DbRow[]> {
  const columns = dbColumns(table);
  const where = Object.entries(q ?? {}).filter(([key]) =>
    columns.includes(key),
  );
  const whereSql = where
    .map(([key], i) => `${ident(key)} = $${i + 1}`)
    .join(" AND ");
  const sql = `SELECT * FROM ${ident(table)}${whereSql ? ` WHERE ${whereSql}` : ""}`;
  const res = await client.query(
    sql,
    where.map(([, value]) => String(value)),
  );
  return res.rows as DbRow[];
}

async function pgAppend(
  client: PoolClient,
  table: DbTable,
  row: DbRow,
): Promise<DbRow> {
  const clean = cleanRow(table, row);
  const key = dbKey(table);
  if (!clean[key]) {
    if (table === "users") throw new Error("kode wajib diisi");
    // ponytail: `FOR UPDATE` ilegal bersama agregat (MAX) di Postgres —
    // errornya "FOR UPDATE is not allowed with aggregate functions". Ganti
    // dengan lock berlingkup transaksi: hanya memblokir penulis lain ke tabel
    // yang sama selama alokasi id + insert, pembaca (SELECT) tetap bebas.
    // Dipanggil selalu di dalam transaksi (dbAppend/dbTransaction), jadi lock
    // otomatis dilepas saat COMMIT/ROLLBACK.
    // Ceiling: lock per-tabel (bukan per-baris) — cukup untuk skala ujian ini;
    // naikkan ke sequence/identity column bila throughput tulis jadi tinggi.
    await client.query(`LOCK TABLE ${ident(table)} IN EXCLUSIVE MODE`);
    const max = await client.query(
      `SELECT COALESCE(MAX(CASE WHEN ${ident("id")} ~ '^[0-9]+$' THEN ${ident("id")}::bigint ELSE 0 END), 0) AS max_id FROM ${ident(table)}`,
    );
    clean.id = String(Number(max.rows[0]?.max_id ?? 0) + 1);
  }
  if ("ts" in clean && !clean.ts && table === "kedatangan") {
    clean.ts = new Date().toISOString();
  }
  const columns = dbColumns(table).filter(
    (column) => clean[column] !== undefined,
  );
  const values = columns.map((column) => clean[column] ?? "");
  const sql = `INSERT INTO ${ident(table)} (${columns.map(ident).join(", ")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`;
  const res = await client.query(sql, values);
  return res.rows[0] as DbRow;
}

async function pgUpdate(
  client: Pool | PoolClient,
  table: DbTable,
  id: string,
  updates: DbRow,
): Promise<string> {
  const key = dbKey(table);
  const columns = dbColumns(table).filter(
    (column) => column !== key && updates[column] !== undefined,
  );
  if (columns.length === 0)
    throw new Error("tidak ada kolom valid untuk diupdate");
  const setSql = columns
    .map((column, i) => `${ident(column)} = $${i + 1}`)
    .join(", ");
  const values = columns.map((column) => updates[column] ?? "");
  values.push(id);
  const res = await client.query(
    `UPDATE ${ident(table)} SET ${setSql} WHERE ${ident(key)} = $${values.length} RETURNING ${ident(key)}`,
    values,
  );
  if (res.rowCount !== 1) throw new Error(`baris tidak ditemukan: ${id}`);
  return id;
}

/** Baca baris — PG bila URL ada, mock bila tidak. */
export async function dbRead(
  table: string,
  q?: Record<string, string>,
): Promise<DbRow[]> {
  const name = tableOrThrow(table);
  if (!isDatabaseConfigured()) return mockRead(name, q);
  return pgRead(getPool(), name, q);
}

/** Tambah baris — PG bila URL ada, mock bila tidak. */
export async function dbAppend(table: string, row: DbRow): Promise<DbRow> {
  const name = tableOrThrow(table);
  if (!isDatabaseConfigured()) return mockAppend(name, row);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await pgAppend(client, name, row);
    await client.query("COMMIT");
    return out;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Update baris by id (users by kode) — PG bila URL ada, mock bila tidak. */
export async function dbUpdate(
  table: string,
  id: string,
  updates: DbRow,
): Promise<string> {
  const name = tableOrThrow(table);
  if (!isDatabaseConfigured()) return mockUpdate(name, id, updates);
  return pgUpdate(getPool(), name, id, updates);
}

/** Hapus baris by id (users by kode) — PG bila URL ada, mock bila tidak. */
export async function dbDelete(table: string, id: string): Promise<string> {
  const name = tableOrThrow(table);
  if (!isDatabaseConfigured()) return mockDelete(name, id);
  const key = dbKey(name);
  const res = await getPool().query(
    `DELETE FROM ${ident(name)} WHERE ${ident(key)} = $1 RETURNING ${ident(key)}`,
    [id],
  );
  if (res.rowCount !== 1) throw new Error(`baris tidak ditemukan: ${id}`);
  return id;
}

/** Kosongkan satu tabel (PG/mock) — impor pengumuman bersifat menimpa penuh. */
export async function dbDeleteAll(table: string): Promise<number> {
  const name = tableOrThrow(table);
  if (!isDatabaseConfigured()) return mockDeleteAll(name);
  const res = await getPool().query(`DELETE FROM ${ident(name)}`);
  return res.rowCount ?? 0;
}

/** Tambah banyak baris sekali jalan (impor massal ~1.000 baris). */
export async function dbAppendMany(
  table: string,
  rows: DbRow[],
): Promise<number> {
  const name = tableOrThrow(table);
  if (rows.length === 0) return 0;
  if (!isDatabaseConfigured()) {
    for (const row of rows) await mockAppend(name, row);
    return rows.length;
  }
  const key = dbKey(name);
  // ponytail: id WAJIB ikut di-INSERT — dihitung dari seq di bawah, kolomnya
  // TEXT PRIMARY KEY tanpa DEFAULT. Membuang id → "null value in column id".
  const cols = dbColumns(name);
  // ponytail: chunk 500 baris agar jumlah parameter ($) jauh di bawah batas
  // Postgres (65.535); satu transaksi supaya gagal = tak ada yang tersimpan.
  const CHUNK = 500;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`LOCK TABLE ${ident(name)} IN EXCLUSIVE MODE`);
    const max = await client.query(
      `SELECT COALESCE(MAX(CASE WHEN ${ident("id")} ~ '^[0-9]+$' THEN ${ident("id")}::bigint ELSE 0 END), 0) AS max_id FROM ${ident(name)}`,
    );
    let seq = Number(max.rows[0]?.max_id ?? 0);
    let total = 0;
    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      const placeholders: string[] = [];
      const values: unknown[] = [];
      chunk.forEach((row, ri) => {
        const clean = cleanRow(name, row);
        clean[key] = String(seq + ri + 1);
        placeholders.push(
          `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(", ")})`,
        );
        for (const c of cols) values.push(clean[c] ?? "");
      });
      const sql = `INSERT INTO ${ident(name)} (${cols.map(ident).join(", ")}) VALUES ${placeholders.join(", ")} RETURNING ${ident(key)}`;
      const res = await client.query(sql, values);
      total += res.rowCount ?? 0;
      seq += chunk.length;
    }
    await client.query("COMMIT");
    return total;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export interface DbTx {
  read: (table: DbTable, q?: Record<string, string>) => Promise<DbRow[]>;
  append: (table: DbTable, row: DbRow) => Promise<DbRow>;
  update: (table: DbTable, id: string, updates: DbRow) => Promise<string>;
}

/** Transaksi DB; mock dieksekusi langsung tanpa rollback. */
export async function dbTransaction<T>(
  work: (tx: DbTx) => Promise<T>,
): Promise<T> {
  if (!isDatabaseConfigured()) {
    return work({
      read: (table, q) => mockRead(table, q),
      append: (table, row) => mockAppend(table, row),
      update: (table, id, updates) => mockUpdate(table, id, updates),
    });
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await work({
      read: (table, q) => pgRead(client, table, q),
      append: (table, row) => pgAppend(client, table, row),
      update: (table, id, updates) => pgUpdate(client, table, id, updates),
    });
    await client.query("COMMIT");
    return out;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** DDL tabel aplikasi. Idempotent; tidak menghapus data. */
export function appSchemaSql(): string {
  const tables = (Object.keys(DB_TABLES) as DbTable[]).map((table) => {
    const columns = dbColumns(table)
      .map((column) => {
        if (column === "id" && table !== "users")
          return `${ident(column)} TEXT PRIMARY KEY`;
        if (column === "kode" && table === "users")
          return `${ident(column)} TEXT PRIMARY KEY`;
        if (column === "kode" && table === "siswa")
          return `${ident(column)} TEXT NOT NULL UNIQUE`;
        return `${ident(column)} TEXT NOT NULL DEFAULT ''`;
      })
      .join(",\n  ");
    return `CREATE TABLE IF NOT EXISTS ${ident(table)} (\n  ${columns}\n);`;
  });
  return `${tables.join("\n\n")}

CREATE INDEX IF NOT EXISTS siswa_cabang_id_idx ON siswa (cabang_id);
CREATE INDEX IF NOT EXISTS siswa_no_hp_wali_idx ON siswa (no_hp_wali);
CREATE INDEX IF NOT EXISTS siswa_email_idx ON siswa (email);
CREATE INDEX IF NOT EXISTS kedatangan_kode_terdata_idx ON kedatangan (kode_terdata);
`;
}

export async function migrateAppSchema(
  client: Pool | PoolClient = getPool(),
): Promise<void> {
  await client.query(appSchemaSql());
  // ponytail: CREATE TABLE IF NOT EXISTS tak menambah kolom ke tabel lama —
  // kolom baru wajib ALTER eksplisit. Loop generik semua tabel agar kolom
  // masa depan ikut tercakup. Idempoten.
  for (const table of Object.keys(DB_TABLES) as DbTable[]) {
    for (const column of dbColumns(table)) {
      await client.query(
        `ALTER TABLE ${ident(table)} ADD COLUMN IF NOT EXISTS ${ident(column)} TEXT NOT NULL DEFAULT ''`,
      );
    }
  }
}
