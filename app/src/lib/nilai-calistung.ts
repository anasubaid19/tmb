/**
 * Rubrik Calistung SD (M1) — 3 aspek × 1–20 (membaca/menulis/menghitung),
 * total = RATA-RATA. Grade ikut file: A≥17, B≥13, C≥9.
 * Checksum contoh file: (19+14+17)/3 = 16.67 → B Good.
 */

export interface AspekDef {
  /** kunci kolom nilai, mis. "membaca". */
  key: string;
  /** label tampil. */
  label: string;
}

export const ASPEK_CALISTUNG: AspekDef[] = [
  { key: "membaca", label: "Membaca" },
  { key: "menulis", label: "Menulis" },
  { key: "menghitung", label: "Menghitung" },
];

/** Validasi satu aspek: bulat 1–20. */
export function isAspekCalistungValid(v: unknown): boolean {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 20;
}

/** Grade dari rata-rata (0–20). */
export function gradeCalistung(rata: number): string {
  if (rata >= 17) return "A";
  if (rata >= 13) return "B";
  if (rata >= 9) return "C";
  return "D";
}

/** Label grade panjang (sesuai file). */
export function gradeCalistungLabel(grade: string): string {
  switch (grade) {
    case "A":
      return "Excellent (Ready for Advanced Class)";
    case "B":
      return "Good (Ready for Standard Class)";
    case "C":
      return "Fair (Needs Support Class)";
    default:
      return "Weak (Needs Intensive Program)";
  }
}
