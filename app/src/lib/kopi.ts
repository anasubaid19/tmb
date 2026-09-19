import { createServerFn } from "@tanstack/react-start";
import { claimKopiCore, feedKopiCore, peekKopiCore } from "./kopi.server";
import { KUOTA_KOPI_PER_QR, VARIAN_KOPI, type VarianKopi } from "./kopi-meta";
import { getSessionOr } from "./session.server";

/**
 * Server function kopi gratis barista. Aturan & inti ada di `kopi-meta.ts`
 * (murni) dan `kopi.server.ts` (sentuh DB); modul ini hanya pembungkus sesi.
 * Bagian murni juga di-ekspor ulang dari sini untuk tipe/klien.
 */
export type { KopiEvent, KopiStatus, VarianKopi } from "./kopi-meta";

const normKode = (kode: string): string => kode.trim().toUpperCase();

/** Sesi barista (atau admin). */
async function requireBarista(): Promise<{ sub: string }> {
  const s = await getSessionOr("barista");
  if (s?.role !== "barista" && s?.role !== "admin")
    throw new Error("Hanya barista.");
  return { sub: s.sub };
}

export const peekKopiFn = createServerFn()
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const kode = normKode(String((data as Record<string, unknown>).kode ?? ""));
    if (!kode) throw new Error("kode wajib diisi");
    return { kode };
  })
  .handler(async ({ data }) => {
    await requireBarista();
    return peekKopiCore(data.kode);
  });

export const claimKopiFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const kode = normKode(String(d.kode ?? ""));
    if (!kode) throw new Error("kode wajib diisi");
    const items = Array.isArray(d.items) ? d.items : [];
    if (items.length < 1) throw new Error("Pilih minimal 1 kopi.");
    if (items.length > KUOTA_KOPI_PER_QR)
      throw new Error("Jumlah kopi melebihi kuota.");
    if (!items.every((v) => VARIAN_KOPI.includes(v as VarianKopi)))
      throw new Error("Jenis kopi tidak dikenal.");
    return { kode, items: items as VarianKopi[] };
  })
  .handler(async ({ data }) => {
    const s = await requireBarista();
    const r = await claimKopiCore(data.kode, data.items, s.sub);
    return { ok: true as const, ...r };
  });

/** Klaim kopi (feed realtime) — barista/admin, dipoll tiap ~2 dtk. */
export const getKopiFeedFn = createServerFn()
  .validator((data: unknown) => ({
    since:
      typeof data === "object" && data !== null
        ? Number((data as Record<string, unknown>).since ?? 0)
        : 0,
  }))
  .handler(async ({ data }) => {
    await requireBarista();
    return feedKopiCore(data.since);
  });
