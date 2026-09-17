/**
 * Rubrik interview orang tua (M5) — 5 aspek × 1–5, total maks 25.
 * Sumber: file INTERVIEW TEST ORANG TUA + contoh isian (5+2+1+5+5=18
 * → Lulus Standar). Skala kelulusan BERBEDA dari English: 0–9/10–15/16–21/22–25.
 */

export interface AspekDef {
  /** kunci kolom nilai, mis. "ibadah". */
  key: string;
  /** label tampil. */
  label: string;
}

export const ASPEK_ORTU: AspekDef[] = [
  { key: "ibadah", label: "Ibadah" },
  { key: "akhlak", label: "Akhlak & Karakter" },
  { key: "polaasuh", label: "Pola Asuh & Pergaulan" },
  { key: "belajar", label: "Kebiasaan Belajar Anak" },
  { key: "gadget", label: "Penggunaan Gadget" },
];

/** Validasi + parsing 5 aspek (bahan saveOrtuFn, unit-testable). */
export function parseOrtuAspek(input: Record<string, unknown>): number[] {
  const keys = ["ibadah", "akhlak", "polaasuh", "belajar", "gadget"];
  return keys.map((k) => {
    const n = Number(input[k] ?? "");
    if (!Number.isInteger(n) || n < 1 || n > 5)
      throw new Error("Tiap aspek wajib diisi 1–5.");
    return n;
  });
}

/** Grade kelulusan dari total (0–25). */
export function gradeOrtu(total: number): string {
  if (total >= 22) return "A";
  if (total >= 16) return "B";
  if (total >= 10) return "C";
  return "D";
}

/** Label grade panjang (sesuai file). */
export function gradeOrtuLabel(grade: string): string {
  switch (grade) {
    case "A":
      return "Lulus Sangat Baik";
    case "B":
      return "Lulus Standar";
    case "C":
      return "Lulus Minimum";
    default:
      return "Tidak Lulus";
  }
}
