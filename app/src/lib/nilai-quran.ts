import { gradeLabel } from "./nilai-english";

/**
 * Rubrik Al-Qur'an SMP/SMA (M4) — 3 aspek × 1–100 (makharij/sifat/lancar),
 * total = RATA-RATA. Grade ikut file: A≥91, B≥75, C≥51.
 * Checksum contoh file: (70+69+72)/3 = 70.33 → C Fair (bukan Excellent
 * seperti tertulis di contoh — ambang file yang dipakai).
 */

export interface AspekDef {
  /** kunci kolom nilai, mis. "makharij". */
  key: string;
  /** label tampil. */
  label: string;
}

export const ASPEK_QURAN: AspekDef[] = [
  { key: "makharij", label: "Makharijul Huruf" },
  { key: "sifat", label: "Sifatul Huruf" },
  { key: "lancar", label: "Kelancaran" },
];

/** Validasi satu aspek: angka 1–100. */
export function isAspekQuranValid(v: unknown): boolean {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= 100;
}

/** Guard SMP/SMA (SD tak ada tes Quran — hanya Calistung + ortu). */
export function isQuranJenjang(jenjang: string): boolean {
  const j = (jenjang ?? "").trim().toUpperCase();
  return j === "SMP" || j === "SMA";
}

/** Grade dari rata-rata (0–100). Label reuse skala English (identik di file). */
export function gradeQuran(rata: number): string {
  if (rata >= 91) return "A";
  if (rata >= 75) return "B";
  if (rata >= 51) return "C";
  return "D";
}

export { gradeLabel as gradeQuranLabel };
