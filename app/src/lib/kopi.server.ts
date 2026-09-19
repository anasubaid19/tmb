import { dayOf } from "./attendance";
import { dbRead, dbTransaction } from "./db.server";
import {
  type KopiEvent,
  type KopiStatus,
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

/** Nama siswa dari kode QR; lempar bila bukan kode siswa. */
async function siswaByKode(kode: string): Promise<string> {
  const rows = await dbRead("siswa", { kode });
  if (!rows[0]) throw new Error("Kode tidak dikenal.");
  return String(rows[0].nama ?? "");
}

/** Sisa kuota + nama untuk satu QR — dipanggil sebelum barista memilih. */
export async function peekKopiCore(kode: string): Promise<KopiStatus> {
  const k = normKode(kode);
  const [nama, rows] = await Promise.all([
    siswaByKode(k),
    dbRead("kopi", { kode_terdata: k }),
  ]);
  return { kode: k, nama, terpakai: rows.length, sisa: sisaKuota(rows, k) };
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
  if (items.length > KUOTA_KOPI_PER_QR)
    throw new Error("Jumlah kopi melebihi kuota.");
  for (const jenis of items)
    if (!VARIAN_KOPI.includes(jenis))
      throw new Error("Jenis kopi tidak dikenal.");
  await siswaByKode(k);
  const waktu = new Date(now).toISOString();
  return dbTransaction(async (tx) => {
    const before = await tx.read("kopi", { kode_terdata: k });
    if (before.length + items.length > KUOTA_KOPI_PER_QR)
      throw new Error("Kuota kopi habis.");
    for (const jenis of items)
      await tx.append("kopi", { kode_terdata: k, jenis, waktu, oleh });
    // ponytail: append di atas mengunci tabel — recount menutup balapan barista
    // pada cup terakhir; di mock (single-thread) pre-check sudah cukup.
    const after = await tx.read("kopi", { kode_terdata: k });
    if (after.length > KUOTA_KOPI_PER_QR) throw new Error("Kuota kopi habis.");
    return { terpakai: after.length, sisa: sisaKuota(after, k) };
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
