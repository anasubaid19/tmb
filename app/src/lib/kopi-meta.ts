/**
 * Bagian kopi gratis yang aman untuk klien (murni, tanpa impor server).
 * Dipisah dari `kopi.ts` karena modul itu mengimpor `db.server` — komponen
 * klien hanya boleh mengambil tipe + helper dari sini.
 */
export const KUOTA_KOPI_PER_QR = 2;

export type VarianKopi = "americano" | "aren-latte";

export const VARIAN_KOPI: readonly VarianKopi[] = ["americano", "aren-latte"];

export interface KopiStatus {
  kode: string;
  nama: string;
  terpakai: number;
  sisa: number;
}

export interface KopiEvent {
  ts: number;
  waktu: string;
  kode: string;
  nama: string;
  jenis: VarianKopi;
  oleh: string;
  /** Nama barista/admin yang mencatat (resolusi `oleh`). */
  olehNama?: string;
}

export function labelVarian(v: string): string {
  if (v === "americano") return "Americano";
  if (v === "aren-latte") return "Aren Latte";
  return v;
}

/** Sisa kuota dari baris kopi yang sudah ada untuk satu QR. Murni — diuji. */
export function sisaKuota(
  rows: { kode_terdata?: unknown }[],
  kode: string,
): number {
  const k = kode.trim().toUpperCase();
  const dipakai = rows.filter(
    (r) => String(r.kode_terdata ?? "").toUpperCase() === k,
  ).length;
  return Math.max(KUOTA_KOPI_PER_QR - dipakai, 0);
}
