import { createServerFn } from "@tanstack/react-start";

/** Mushaf Arab saja via QuranAPI (quranapi.pages.dev) — fetch di server (bebas CORS).
 * Daftar: GET /api/surah.json · Isi surah: GET /api/<no>.json (`arabic1`).
 */

const BASE = "https://quranapi.pages.dev/api";

export interface SurahInfo {
  no: number;
  nama: string;
  namaArab: string;
  totalAyah: number;
}

export interface AyatArab {
  nomor: number;
  arab: string;
}

export interface SurahArab {
  no: number;
  nama: string;
  namaArab: string;
  ayat: AyatArab[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** ponytail: pemetaan murni diekspor agar bisa diuji tanpa network. */
export function mapDaftarSurah(json: unknown): SurahInfo[] {
  if (!Array.isArray(json)) return [];
  return json.map((s, i) => ({
    no: num((s as Record<string, unknown>).surahNo, i + 1),
    nama: str((s as Record<string, unknown>).surahName) || `Surah ${i + 1}`,
    namaArab: str((s as Record<string, unknown>).surahNameArabic),
    totalAyah: num((s as Record<string, unknown>).totalAyah),
  }));
}

/** ponytail: ambil `arabic1` (Arab bersyakal) saja — tanpa terjemahan. */
export function mapSurahArab(json: unknown, no: number): SurahArab {
  const o =
    typeof json === "object" && json !== null
      ? (json as Record<string, unknown>)
      : {};
  const arab = Array.isArray(o.arabic1) ? o.arabic1 : [];
  return {
    no,
    nama: str(o.surahName) || `Surah ${no}`,
    namaArab: str(o.surahNameArabic),
    ayat: arab.map((a, i) => ({ nomor: i + 1, arab: str(a) })),
  };
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error("Gagal memuat mushaf.");
  return (await res.json()) as unknown;
}

/** Daftar 114 surah untuk picker mushaf. */
export const daftarSurahFn = createServerFn().handler(async () => {
  return mapDaftarSurah(await getJson("/surah.json"));
});

function mustSurahNo(data: unknown): number {
  const no = num(
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>).no
      : NaN,
  );
  if (!Number.isInteger(no) || no < 1 || no > 114)
    throw new Error("Nomor surah 1–114.");
  return no;
}

/** Isi satu surah (Arab saja) untuk modal mushaf. */
export const bacaSurahFn = createServerFn({ method: "GET" })
  .validator(mustSurahNo)
  .handler(async ({ data: no }) => {
    return mapSurahArab(await getJson(`/${no}.json`), no);
  });
