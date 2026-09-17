/** Sumber "soal" per (materi, jenjang) untuk panel penguji.
 *
 * - md: teks soal (.md di `app/public/soal/`, tampil langsung).
 * - pdf: berkas di `app/public/soal/` (Arabic SMP/SMA).
 * - form: Google Form Math SMP/SMA (URL dari CMS `math_gform_url`, tampil QR).
 * - note: tanpa berkas (Calistung cetak di meja, Al-Qur'an, Interview).
 */
export type SoalKind = "md" | "pdf" | "form" | "note";

export interface SoalSource {
  kind: SoalKind;
  /** path PDF (kind pdf) atau .md (kind md). */
  src?: string;
  /** unduhan PDF asli pendamping teks md. */
  pdfDownload?: string;
  /** catatan pengganti (kind note). */
  note?: string;
}

const J = (v: string) => v.trim().toUpperCase();

/** PDF English/Arabic hanya ada untuk SMP & SMA; SD kosong. */
export function soalFor(materiId: string, jenjang: string): SoalSource | null {
  const m = materiId.trim().toUpperCase();
  const j = J(jenjang);
  const sma = j === "SMA";
  const smp = j === "SMP";

  if (m === "M2") {
    // ponytail: teks md tampil langsung (ringan di HP); PDF asli jadi unduhan.
    if (smp)
      return {
        kind: "md",
        src: "/soal/english-smp.md",
        pdfDownload: "/soal/english-smp.pdf",
      };
    if (sma)
      return {
        kind: "md",
        src: "/soal/english-sma.md",
        pdfDownload: "/soal/english-sma.pdf",
      };
    return null;
  }
  if (m === "M3") {
    if (smp || sma) return { kind: "pdf", src: "/soal/arabic-smp-sma.pdf" };
    return null;
  }
  if (m === "M1") {
    // ponytail: Calistung SD = cetak; Math SMP/SMA = Google Form (QR).
    if (smp || sma) return { kind: "form" };
    return {
      kind: "note",
      note: "Soal Calistung dalam bentuk cetak — tersedia di meja.",
    };
  }
  if (m === "M4")
    return { kind: "note", note: "Penilaian langsung (setoran hafalan)." };
  if (m === "M5") return { kind: "md", src: "/soal/ortu.md" };
  return null;
}

/** Bentuk penilaian per materi: skor angka, tanda selesai, atau catatan. */
export type NilaiKind = "skor" | "selesai" | "catatan";

export function nilaiKindFor(materiId: string, jenjang: string): NilaiKind {
  const m = materiId.trim().toUpperCase();
  const j = J(jenjang);
  if (m === "M1" && (j === "SMP" || j === "SMA")) return "selesai";
  if (m === "M5") return "catatan";
  return "skor";
}

/** Penanda "sudah ujian" Math (disimpan di kolom nilai_calistung_math). */
export const NILAI_SELESAI = "SELESAI";
