/** Kode peserta E-Ticket: {CABANG}-{HURUF}{SEQ}, mis. AW1-A001.
 *  Huruf: SD=A, SMP=B, SMA=C, Kinder (PG/TK)=K, tak dikenal=X.
 *  Sinkron dengan scripts/import_siswa.py. */
export function jenjangLetter(jenjang: string): string {
  const j = (jenjang ?? "").trim().toUpperCase();
  if (j.startsWith("TK")) return "K";
  if (j === "SD") return "A";
  if (j === "SMP") return "B";
  if (j === "SMA") return "C";
  if (j === "PG") return "K";
  return "X";
}

export function ticketKode(
  cabangId: string,
  jenjang: string,
  seq: number,
): string {
  return `${cabangId}-${jenjangLetter(jenjang)}${String(seq).padStart(3, "0")}`;
}

/** Kode login penguji: P{seq}, mis. P4.
 *  ponytail: seq = suffix numerik terbesar + 1; upgrade ke acak bila volume tinggi. */
export function nextPengujiKode(existing: string[]): string {
  let max = 0;
  for (const k of existing ?? []) {
    const m = /^P(\d+)$/i.exec((k ?? "").trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `P${max + 1}`;
}

/** Nilai jenjang yang menghasilkan huruf valid (bukan X). */
export const JENJANG_PILIHAN = [
  "SD",
  "SMP",
  "SMA",
  "PG",
  "TK-A",
  "TK-B",
] as const;

export function isJenjangValid(jenjang: string): boolean {
  return jenjangLetter(jenjang) !== "X";
}
