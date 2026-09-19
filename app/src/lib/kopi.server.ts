import { dayOf } from "./attendance";
import { dbRead, dbTransaction } from "./db.server";
import {
  type KopiEvent,
  type KopiStatus,
  KUOTA_KOPI_PENGUJI,
  KUOTA_KOPI_PER_QR,
  sisaKuota,
  VARIAN_KOPI,
  type VarianKopi,
} from "./kopi-meta";

/**
 * Inti kopi gratis — server-only (sentuh DB). Dipisah dari `kopi.ts` agar
 * modul server-fn tak membawa `db.server` ke bundel klien lewat fungsi biasa.
 */

const normKode = (kode: string): string => kode.trim().toUpperCase();

/** Nama + kuota dari kode QR — siswa 2 cup, penguji 1 cup; lempar bila asing. */
async function subjekByKode(
  kode: string,
): Promise<{ nama: string; kuota: number }> {
  const siswa = await dbRead("siswa", { kode });
  if (siswa[0])
    return { nama: String(siswa[0].nama ?? ""), kuota: KUOTA_KOPI_PER_QR };
  const penguji = await dbRead("penguji", { kode });
  if (penguji[0])
    return { nama: String(penguji[0].nama ?? ""), kuota: KUOTA_KOPI_PENGUJI };
  throw new Error("Kode tidak dikenal.");
}

/** Sisa kuota + nama untuk satu QR — dipanggil sebelum barista memilih. */
export async function peekKopiCore(kode: string): Promise<KopiStatus> {
  const k = normKode(kode);
  const [subjek, rows] = await Promise.all([
    subjekByKode(k),
    dbRead("kopi", { kode_terdata: k }),
  ]);
  return {
    kode: k,
    nama: subjek.nama,
    terpakai: rows.length,
    kuota: subjek.kuota,
    sisa: sisaKuota(rows, k, subjek.kuota),
  };
}

/**
 * Klaim 1–2 cangkir sekaligus. Atomik: pre-check sisa lalu tulis di dalam
 * transaksi, recount setelah append mengunci tabel — dua barista tak bisa
 * melewati kuota (baris berlebih di-rollback). Mock (tanpa DB) cukup pre-check.
 */
export async function claimKopiCore(
  kode: string,
  items: VarianKopi[],
  oleh: string,
  now = Date.now(),
): Promise<{ terpakai: number; sisa: number }> {
  const k = normKode(kode);
  if (items.length < 1) throw new Error("Pilih minimal 1 kopi.");
  for (const jenis of items)
    if (!VARIAN_KOPI.includes(jenis))
      throw new Error("Jenis kopi tidak dikenal.");
  const { kuota } = await subjekByKode(k);
  if (items.length > kuota) throw new Error("Jumlah kopi melebihi kuota.");
  const waktu = new Date(now).toISOString();
  return dbTransaction(async (tx) => {
    const before = await tx.read("kopi", { kode_terdata: k });
    if (before.length + items.length > kuota)
      throw new Error("Kuota kopi habis.");
    for (const jenis of items)
      await tx.append("kopi", { kode_terdata: k, jenis, waktu, oleh });
    // ponytail: append di atas mengunci tabel — recount menutup balapan barista
    // pada cup terakhir; di mock (single-thread) pre-check sudah cukup.
    const after = await tx.read("kopi", { kode_terdata: k });
    if (after.length > kuota) throw new Error("Kuota kopi habis.");
    return { terpakai: after.length, sisa: sisaKuota(after, k, kuota) };
  });
}

// ponytail: nama kode→nama dibaca sekali per proses (data statis saat ujian);
// feed hanya membaca tabel `kopi` yang kecil tiap poll.
let namaCache: Map<string, string> | null = null;

async function kodeNamaMap(): Promise<Map<string, string>> {
  if (namaCache) return namaCache;
  const [users, siswa] = await Promise.all([dbRead("users"), dbRead("siswa")]);
  const map = new Map<string, string>();
  for (const u of users) map.set(String(u.kode ?? ""), String(u.nama ?? ""));
  for (const s of siswa) map.set(String(s.kode ?? ""), String(s.nama ?? ""));
  namaCache = map;
  return map;
}

export function resetKopiCache(): void {
  namaCache = null;
}

/** Baris kopi hari ini (setelah `since`) untuk feed realtime. */
export async function feedKopiCore(since: number): Promise<KopiEvent[]> {
  const today = dayOf(Date.now());
  const [rows, nama] = await Promise.all([dbRead("kopi"), kodeNamaMap()]);
  return rows
    .map((r) => {
      const waktu = String(r.waktu ?? "");
      const ts = Date.parse(waktu);
      const kode = String(r.kode_terdata ?? "");
      const oleh = String(r.oleh ?? "");
      return {
        ts: Number.isNaN(ts) ? 0 : ts,
        waktu,
        kode,
        nama: nama.get(kode) ?? "",
        jenis: String(r.jenis ?? "americano") as VarianKopi,
        oleh,
        olehNama: nama.get(oleh) ?? "",
      };
    })
    .filter((e) => e.ts > since && dayOf(e.ts) === today)
    .sort((a, b) => a.ts - b.ts)
    .slice(-200);
}
