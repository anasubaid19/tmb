/**
 * Rubrik penilaian English + interview santri (SMP & SMA sama).
 * Sumber: PDF diagnostic + contoh isian tahun lalu — 4 aspek × 1–5,
 * total = jumlah, grade skala 0–8/9–12/13–16/17–20.
 */

export interface AspekDef {
  /** kunci kolom nilai, mis. "fluency". */
  key: string;
  /** label tampil. */
  label: string;
}

/** 4 aspek English (kolom nilai_english_*). */
export const ASPEK_ENGLISH: AspekDef[] = [
  { key: "fluency", label: "Fluency" },
  { key: "vocab", label: "Vocabulary & Grammar" },
  { key: "critical", label: "Critical Thinking" },
  { key: "expression", label: "Expression & Clarity" },
];

/** 4 aspek interview santri (kolom nilai_santri_*). */
export const ASPEK_SANTRI: AspekDef[] = [
  { key: "sholat", label: "Kebiasaan Sholat" },
  { key: "quran", label: "Bacaan Qur'an" },
  { key: "mapel", label: "Mata Pelajaran Disukai" },
  { key: "ortu", label: "Yang Dikagumi dari Orang Tua" },
];

/** Nilai aspek valid: bulat 1–5. */
export function isAspekValid(v: unknown): boolean {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

/**
 * Aspek English + santri hanya untuk SMP/SMA — SD hanya Calistung (M1) +
 * interview orangtua (M5).
 */
export function isAspekJenjang(jenjang: string): boolean {
  return (jenjang ?? "").trim().toUpperCase() !== "SD";
}

/** Grade dari total (0–20). */
export function gradeEnglish(total: number): string {
  if (total >= 17) return "A";
  if (total >= 13) return "B";
  if (total >= 9) return "C";
  return "D";
}

/** Label grade panjang (sesuai file: Excellent/Good/Fair/Weak). */
export function gradeLabel(grade: string): string {
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
