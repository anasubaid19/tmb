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
