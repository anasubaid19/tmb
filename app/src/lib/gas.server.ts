import { dbAppend, dbRead, dbUpdate, isDatabaseConfigured } from "./db.server";
import { mockAppend, mockRead, mockUpdate } from "./seed";

export type GasRow = Record<string, string | number | boolean | null>;

interface GasSuccess {
  ok: true;
  rows?: GasRow[];
  row?: GasRow;
  id?: string;
  time?: string;
}

// ponytail: GAS (Google Apps Script/Sheets) sudah pensiun, diganti PostgreSQL.
// Nama fungsi dipertahankan agar 79 pemanggil tidak berubah. Bila DATABASE_URL
// tidak diisi, seluruh baca/tulis jatuh ke mock in-memory (seed.ts).

/** Baca publik (untuk data landing + cache). */
export async function gasGetRead(
  table: string,
  q?: Record<string, string>,
): Promise<GasRow[]> {
  if (isDatabaseConfigured()) return dbRead(table, q);
  return mockRead(table, q);
}

/** Operasi privat (lookup sensitif + semua tulis). */
export async function gasPost(
  op: "read" | "append" | "update",
  payload: {
    table: string;
    row?: GasRow;
    id?: string;
    updates?: GasRow;
    q?: Record<string, string>;
  },
): Promise<GasSuccess> {
  if (isDatabaseConfigured()) {
    if (op === "read") {
      return { ok: true, rows: await dbRead(payload.table, payload.q) };
    }
    if (op === "append") {
      return {
        ok: true,
        row: await dbAppend(payload.table, payload.row ?? {}),
      };
    }
    return {
      ok: true,
      id: await dbUpdate(
        payload.table,
        payload.id ?? "",
        payload.updates ?? {},
      ),
    };
  }
  if (op === "read") {
    return { ok: true, rows: await mockRead(payload.table, payload.q) };
  }
  if (op === "append") {
    return {
      ok: true,
      row: await mockAppend(payload.table, payload.row ?? {}),
    };
  }
  return {
    ok: true,
    id: await mockUpdate(
      payload.table,
      payload.id ?? "",
      payload.updates ?? {},
    ),
  };
}
