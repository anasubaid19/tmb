import { createServerFn } from "@tanstack/react-start";
import { toDataURL } from "qrcode";
import { gasPost } from "./gas.server";
import { getSessionOr } from "./session.server";
import { isTrue } from "./site";

export type TipeHadir = "siswa" | "penguji";

export interface AttendanceEvent {
  ts: number;
  waktu: string;
  kode: string;
  nama: string;
  tipe: TipeHadir;
  oleh: string;
}

// ponytail: feed realtime = buffer memori dalam satu proses Bun + polling 2 dtk.
// Nol baca GAS per poll (hemat kuota); WebSocket ditunda hingga multi-instance.
// WIB = UTC+7, dipakai untuk batas "hari ini".
const WIB_OFFSET_MS = 7 * 3600 * 1000;
const FEED_MAX = 1000;

export function dayOf(ts: number): string {
  return new Date(ts + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Jam (0–23) dalam WIB untuk bucket grafik. */
export function wibHour(ts: number): number {
  return new Date(ts + WIB_OFFSET_MS).getUTCHours();
}

export function isDuplicateToday(
  events: AttendanceEvent[],
  kode: string,
  nowTs: number,
): boolean {
  const today = dayOf(nowTs);
  return events.some((e) => e.kode === kode && dayOf(e.ts) === today);
}

let feed: AttendanceEvent[] = [];
let seededDay = "";
const qrCache = new Map<string, string>();
let totalsCache: {
  at: number;
  siswaTotal: number;
  pengujiTotal: number;
  kodeUtama: string[];
} | null = null;

async function seedFeedIfNeeded(): Promise<void> {
  const today = dayOf(Date.now());
  if (seededDay === today) return;
  seededDay = today;
  feed = [];
  try {
    const res = await gasPost("read", { table: "kedatangan" });
    feed = (res.rows ?? [])
      .map((r) => ({
        ts: Date.parse(String(r.waktu ?? "")),
        waktu: String(r.waktu ?? ""),
        kode: String(r.kode_terdata ?? ""),
        nama: "",
        tipe: (String(r.tipe ?? "") === "penguji"
          ? "penguji"
          : "siswa") as TipeHadir,
        oleh: String(r.oleh ?? ""),
      }))
      .filter((e) => !Number.isNaN(e.ts) && dayOf(e.ts) === today)
      .sort((a, b) => a.ts - b.ts)
      .slice(-FEED_MAX);
  } catch {
    // GAS belum siap — feed mulai kosong, scan tetap dicatat saat memungkinkan.
  }
}

function pushEvent(e: AttendanceEvent): void {
  feed.push(e);
  if (feed.length > FEED_MAX) feed = feed.slice(-FEED_MAX);
}

/** Catat kedatangan — panitia/admin. Idempoten per kode per hari. */
export const recordAttendanceFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const kode = String((data as Record<string, unknown>).kode ?? "")
      .trim()
      .toUpperCase();
    if (!kode) throw new Error("kode wajib diisi");
    return { kode };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("panitia");
    if (s?.role !== "panitia" && s?.role !== "admin")
      throw new Error("Hanya panitia.");
    await seedFeedIfNeeded();
    const now = Date.now();

    let nama = "";
    let tipe: TipeHadir = "siswa";
    const siswa = await gasPost("read", {
      table: "siswa",
      q: { kode: data.kode },
    });
    if (siswa.rows?.[0]) {
      nama = String(siswa.rows[0].nama ?? "");
    } else {
      const penguji = await gasPost("read", {
        table: "penguji",
        q: { kode: data.kode },
      });
      if (!penguji.rows?.[0]) throw new Error("Kode tidak dikenal.");
      nama = String(penguji.rows[0].nama ?? "");
      tipe = "penguji";
    }

    if (isDuplicateToday(feed, data.kode, now))
      return { ok: true as const, duplicate: true, nama, tipe };

    const waktu = new Date(now).toISOString();
    await gasPost("append", {
      table: "kedatangan",
      row: { kode_terdata: data.kode, tipe, waktu, oleh: s.sub },
    });
    pushEvent({ ts: now, waktu, kode: data.kode, nama, tipe, oleh: s.sub });
    return { ok: true as const, duplicate: false, nama, tipe };
  });

/** Feed realtime dari memori — dipoll dashboard tiap ~2 dtk. */
export const getFeedFn = createServerFn()
  .validator((data: unknown) => ({
    since:
      typeof data === "object" && data !== null
        ? Number((data as Record<string, unknown>).since ?? 0)
        : 0,
  }))
  .handler(async ({ data }): Promise<AttendanceEvent[]> => {
    const s = await getSessionOr("panitia");
    if (!s || (s.role !== "panitia" && s.role !== "admin"))
      throw new Error("Hanya panitia.");
    await seedFeedIfNeeded();
    const today = dayOf(Date.now());
    return feed
      .filter((e) => e.ts > data.since && dayOf(e.ts) === today)
      .slice(-200);
  });

/** Statistik kehadiran — total di-cache 60 dtk agar hemat kuota GAS. */
export const getStatsFn = createServerFn().handler(async () => {
  const s = await getSessionOr("panitia");
  if (!s || (s.role !== "panitia" && s.role !== "admin"))
    throw new Error("Hanya panitia.");
  await seedFeedIfNeeded();
  const today = dayOf(Date.now());
  const todayEvents = feed.filter((e) => dayOf(e.ts) === today);
  if (!totalsCache || Date.now() - totalsCache.at > 60_000) {
    const [siswa, penguji, cabang] = await Promise.all([
      gasPost("read", { table: "siswa" }),
      gasPost("read", { table: "penguji" }),
      gasPost("read", { table: "cabang" }),
    ]);
    // ponytail: stats hanya cabang utama (landing: AW1/AW3/AW4), bukan semua cabang.
    const utama = new Set(
      (cabang.rows ?? [])
        .filter((c) => isTrue(String(c.landing ?? "")))
        .map((c) => String(c.id ?? "")),
    );
    const kodeUtama = (siswa.rows ?? [])
      .filter((r) => utama.has(String(r.cabang_id ?? "")))
      .map((r) => String(r.kode ?? ""));
    totalsCache = {
      at: Date.now(),
      siswaTotal: kodeUtama.length,
      pengujiTotal: penguji.rows?.length ?? 0,
      kodeUtama,
    };
  }
  const dalam = new Set(totalsCache.kodeUtama);
  const hadirSiswa = todayEvents.filter(
    (e) => e.tipe === "siswa" && dalam.has(e.kode),
  );
  // ponytail: bucket per jam WIB 06–18, agregat di memori (feed ≤1000).
  const grafik = [];
  for (let h = 6; h <= 18; h++) {
    const diJam = (e: AttendanceEvent) => wibHour(e.ts) === h;
    grafik.push({
      jam: `${String(h).padStart(2, "0")}.00`,
      siswa: hadirSiswa.filter(diJam).length,
      penguji: todayEvents.filter((e) => e.tipe === "penguji" && diJam(e))
        .length,
    });
  }
  return {
    siswaHadir: hadirSiswa.length,
    pengujiHadir: todayEvents.filter((e) => e.tipe === "penguji").length,
    siswaTotal: totalsCache.siswaTotal,
    pengujiTotal: totalsCache.pengujiTotal,
    grafik,
  };
});

export async function ticketQr(kode: string): Promise<string> {
  const hit = qrCache.get(kode);
  if (hit) return hit;
  const qr = await toDataURL(kode, { width: 256, margin: 1 });
  qrCache.set(kode, qr);
  return qr;
}
