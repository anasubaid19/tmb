import type { DbRow } from "./db-schema";
import { normalizePhone } from "./phone";

const str = (row: DbRow, key: string): string => String(row[key] ?? "").trim();

export type SiswaLoginMode = "phone" | "email";

/**
 * Login siswa hanya lewat nomor HP wali atau email (tanpa kode peserta).
 * `phone` dinormalisasi ke format kanonis 08…; `email` dicocokkan
 * case-insensitive.
 */
export function resolveSiswaLogin(
  rows: DbRow[],
  mode: SiswaLoginMode,
  identifier: string,
): DbRow[] {
  const value = identifier.trim();
  if (!value) return [];
  if (mode === "email") {
    const email = value.toLowerCase();
    return rows.filter((row) => str(row, "email").toLowerCase() === email);
  }
  const phone = normalizePhone(value);
  if (!phone) return [];
  return rows.filter((row) => normalizePhone(str(row, "no_hp_wali")) === phone);
}
