import { createServerFn } from "@tanstack/react-start";

/** Mushaf Arab saja via UmmahAPI (ummahapi.com) — fetch di server (bebas CORS).
 * Daftar: GET /api/quran/surahs · Isi surah: GET /api/quran/surah/<no>
 * (`data.verses[].arabic`, sudah bersyakal). Tanpa kunci API (100 req/menit).
 * ponytail: teks Arab identik dengan QuranAPI lama setelah trim spasi tepi.
 */

const BASE = "https://ummahapi.com/api/quran";

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

/** Bentuk respons UmmahAPI: { success, data: { surahs | surah | verses } }. */
interface Envelope {
  data?: { surahs?: unknown; surah?: unknown; verses?: unknown };
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
  const rows = (json as Envelope)?.data?.surahs;
  if (!Array.isArray(rows)) return [];
  return rows.map((s, i) => {
    const o = s as Record<string, unknown>;
    return {
      no: num(o.number, i + 1),
      nama: str(o.name_english) || str(o.name_complex) || `Surah ${i + 1}`,
      namaArab: str(o.name_arabic),
      totalAyah: num(o.verses_count),
    };
  });
}

/** ponytail: ambil `verses[].arabic` (Arab bersyakal) saja — tanpa terjemahan.
 * Spasi tepi dibuang (UmmahAPI mengirim " قُلْ …"). */
export function mapSurahArab(json: unknown, no: number): SurahArab {
  const d = (json as Envelope)?.data;
  const surah = (d?.surah ?? {}) as Record<string, unknown>;
  const verses = Array.isArray(d?.verses) ? d.verses : [];
  return {
    no: num(surah.number, no),
    nama: str(surah.name_english) || `Surah ${no}`,
    namaArab: str(surah.name_arabic),
    ayat: verses.map((v, i) => {
      const o = v as Record<string, unknown>;
      return { nomor: num(o.ayah, i + 1), arab: str(o.arabic).trim() };
    }),
  };
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error("Gagal memuat mushaf.");
  return (await res.json()) as unknown;
}

/** Daftar 114 surah untuk picker mushaf. */
export const daftarSurahFn = createServerFn().handler(async () => {
  return mapDaftarSurah(await getJson("/surahs"));
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
    return mapSurahArab(await getJson(`/surah/${no}`), no);
  });
