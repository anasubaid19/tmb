/**
 * Rubrik Bahasa Arab SMP/SMA (M3) — 4 aspek × 1–25, total = JUMLAH
 * (maks 100). Grade ikut FILE: A≥91, B≥75, C≥51.
 * Checksum contoh file: 20+20+25+10 = 75 → B. (Rumus AVERAGE di sheet
 * adalah bug — rata-rata maks 25 sehingga semua siswa dapat D selamanya;
 * sengaja tidak direplikasi.)
 */

export interface AspekDef {
  /** kunci kolom nilai, mis. "pd". */
  key: string;
  /** label tampil (Indonesia + Arab). */
  label: string;
}

export const ASPEK_ARAB: AspekDef[] = [
  { key: "pd", label: "Percaya diri (الشجاعة وثقة النفس)" },
  { key: "kelancaran", label: "Kelancaran (الطلاقة في الكلام)" },
  { key: "kejelasan", label: "Kejelasan (الوضوح في الكلام)" },
  { key: "adab", label: "Adab (آداب الكلام)" },
];

/** Validasi satu aspek: bulat 1–25. */
export function isAspekArabValid(v: unknown): boolean {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 25;
}

/** Tes Arab hanya untuk SMP/SMA (SD tak ada). */
export function isArabJenjang(jenjang: string): boolean {
  const j = (jenjang ?? "").trim().toUpperCase();
  return j === "SMP" || j === "SMA";
}

/** Grade dari total jumlah (0–100). */
export function gradeArab(total: number): string {
  if (total >= 91) return "A";
  if (total >= 75) return "B";
  if (total >= 51) return "C";
  return "D";
}

/** Label grade (sesuai PDF). */
export function gradeArabLabel(grade: string): string {
  switch (grade) {
    case "A":
      return "Berbicara lancar seperti penutur bahasa Arab asli";
    case "B":
      return "Berbicara lancar tetapi masih ada kesalahan di nahwu";
    case "C":
      return "Hanya bisa menjawab dengan jawaban satu kata";
    default:
      return "Tidak bisa sama sekali";
  }
}
