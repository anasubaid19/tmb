import { createServerFn } from "@tanstack/react-start";
import { type GasRow, gasGetRead, gasPost } from "./gas.server";
import { getSessionOr } from "./session.server";

export const CONFIG_KEYS = [
  "show_jadwal",
  "show_kelas",
  "show_materi",
  "show_denah",
  "show_pengumuman",
  "countdown_enabled",
  "countdown_at",
  "umumkan_hasil",
  "math_gform_url",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export interface SiteConfig {
  showJadwal: boolean;
  showKelas: boolean;
  showMateri: boolean;
  showDenah: boolean;
  showPengumuman: boolean;
  countdownEnabled: boolean;
  countdownAt: string;
  umumkanHasil: boolean;
  /** URL Google Form Math SMP/SMA (CMS; kosong = belum diisi). */
  mathGformUrl: string;
}

const DEFAULT_CONFIG: SiteConfig = {
  showJadwal: true,
  showKelas: true,
  showMateri: true,
  // ponytail: denah default tersembunyi — diaktifkan admin via CMS bila perlu.
  showDenah: false,
  showPengumuman: true,
  countdownEnabled: false,
  countdownAt: "",
  umumkanHasil: false,
  mathGformUrl: "",
};

const str = (row: GasRow, key: string): string => String(row[key] ?? "").trim();

export const isTrue = (v: string): boolean =>
  v.trim().toLowerCase() === "true" || v.trim() === "1";

// ponytail: config per-cabang menimpa global; baris global = cabang_id kosong.
export function mergeConfig(rows: GasRow[], cabangId: string): SiteConfig {
  const pick = (key: string): string => {
    const specific = rows.find(
      (r) => str(r, "key") === key && str(r, "cabang_id") === cabangId,
    );
    if (specific) return str(specific, "value");
    const global = rows.find(
      (r) => str(r, "key") === key && !str(r, "cabang_id"),
    );
    return global ? str(global, "value") : "";
  };
  return {
    showJadwal: pick("show_jadwal") === "" ? true : isTrue(pick("show_jadwal")),
    showKelas: pick("show_kelas") === "" ? true : isTrue(pick("show_kelas")),
    showMateri: pick("show_materi") === "" ? true : isTrue(pick("show_materi")),
    showDenah: pick("show_denah") === "" ? false : isTrue(pick("show_denah")),
    showPengumuman:
      pick("show_pengumuman") === "" ? true : isTrue(pick("show_pengumuman")),
    countdownEnabled: isTrue(pick("countdown_enabled")),
    countdownAt: pick("countdown_at"),
    umumkanHasil: isTrue(pick("umumkan_hasil")),
    mathGformUrl: pick("math_gform_url"),
  };
}

export interface Cabang {
  id: string;
  nama: string;
  portal: boolean;
  alamat: string;
  program: string;
  /** tampil di landing (3 sekolah utama) */
  landing: boolean;
}

export interface JadwalView {
  id: string;
  tanggal: string;
  sesi: string;
  ruang: string;
  materi: string;
  kelas: string;
  penguji: string;
}

export interface SiteData {
  cabang: Cabang[];
  current: Cabang;
  config: SiteConfig;
  jadwal: JadwalView[];
  kelas: { id: string; nama: string; jenjang: string }[];
  materi: { id: string; nama: string; durasi: string; deskripsi: string }[];
  denah: { id: string; judul: string; imageUrl: string; keterangan: string }[];
}

// ponytail: cache memori 60 dtk, satu proses Bun di VPS. Invalidasi saat admin menyimpan config.
const CACHE_TTL_MS = 60_000;
const siteCache = new Map<string, { at: number; data: SiteData }>();
const umumCache = new Map<string, { at: number; data: PengumumanData }>();

export function clearSiteCache(): void {
  siteCache.clear();
  umumCache.clear();
}

function toCabang(row: GasRow): Cabang {
  return {
    id: str(row, "id"),
    nama: str(row, "nama"),
    portal: isTrue(str(row, "portal")),
    alamat: str(row, "alamat"),
    program: str(row, "program"),
    landing: !("landing" in row) || isTrue(str(row, "landing")),
  };
}

/** Status koneksi GAS publik (bukan rahasia) — untuk indikator global. */
export const getGasStatusFn = createServerFn().handler(async () => {
  const gas = (await import("./gas-settings.server")).gasStatus();
  return { connected: gas.connected, source: gas.source };
});

export const getSiteDataFn = createServerFn()
  .validator((data: unknown) => ({
    cabangId:
      typeof data === "object" && data !== null
        ? String((data as Record<string, unknown>).cabangId ?? "")
        : "",
  }))
  .handler(async ({ data }): Promise<SiteData> => {
    const cached = siteCache.get(data.cabangId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    const [
      cabangRows,
      configRows,
      jadwalRows,
      kelasRows,
      materiRows,
      denahRows,
      pengujiRows,
    ] = await Promise.all([
      gasGetRead("cabang"),
      gasGetRead("config"),
      gasGetRead("jadwal"),
      gasGetRead("kelas"),
      gasGetRead("materi"),
      gasGetRead("denah"),
      gasGetRead("penguji"),
    ]);

    const cabang = cabangRows.map(toCabang).filter((c) => c.id);
    const current =
      cabang.find((c) => c.id === data.cabangId) ??
      cabang.find((c) => c.portal) ??
      cabang[0];
    if (!current) throw new Error("Data cabang belum diisi.");
    // ponytail: ?cabang= kosong = landing UMUM — tampilkan data semua cabang
    // (bukan terpaku ke cabang portal). ?cabang= terisi = tampilkan per-cabang.
    const general = !data.cabangId;
    const inCabang = (r: GasRow) =>
      general
        ? true
        : !str(r, "cabang_id") || str(r, "cabang_id") === current.id;
    const inCabangStrict = (r: GasRow) =>
      general ? true : str(r, "cabang_id") === current.id;

    const config = mergeConfig(configRows, general ? "" : current.id);
    const materiById = new Map(
      materiRows.filter(inCabang).map((r) => [str(r, "id"), str(r, "nama")]),
    );
    const kelasRows_ = general
      ? // ponytail: landing umum — dedupe kelas antar cabang (nama+jenjang sama)
        Array.from(
          new Map(
            kelasRows.map((r) => [`${str(r, "nama")}|${str(r, "jenjang")}`, r]),
          ).values(),
        )
      : kelasRows;
    const kelasById = new Map(
      kelasRows_
        .filter(inCabangStrict)
        .map((r) => [str(r, "id"), str(r, "nama")]),
    );
    const pengujiById = new Map(
      pengujiRows
        .filter(inCabangStrict)
        .map((r) => [str(r, "id"), str(r, "nama")]),
    );

    const result: SiteData = {
      cabang,
      current,
      config,
      jadwal: jadwalRows
        // ponytail: tampil kosong = tampil (kolom boleh absen di sheet lama);
        // admin menyembunyikan per-baris via tab Jadwal.
        .filter((r) => {
          if (!inCabangStrict(r)) return false;
          const t = str(r, "tampil");
          return t === "" || isTrue(t);
        })
        .map((r) => ({
          id: str(r, "id"),
          tanggal: str(r, "tanggal"),
          sesi: str(r, "sesi"),
          ruang: str(r, "ruang"),
          materi: materiById.get(str(r, "materi_id")) ?? "-",
          kelas: kelasById.get(str(r, "kelas_id")) ?? "-",
          penguji: pengujiById.get(str(r, "penguji_id")) ?? "-",
        })),
      kelas: kelasRows_.filter(inCabangStrict).map((r) => ({
        id: str(r, "id"),
        nama: str(r, "nama"),
        jenjang: str(r, "jenjang"),
      })),
      materi: materiRows.filter(inCabang).map((r) => ({
        id: str(r, "id"),
        nama: str(r, "nama"),
        durasi: str(r, "durasi"),
        deskripsi: str(r, "deskripsi"),
      })),
      denah: denahRows.filter(inCabangStrict).map((r) => ({
        id: str(r, "id"),
        judul: str(r, "judul"),
        imageUrl: str(r, "image_url"),
        keterangan: str(r, "keterangan"),
      })),
    };
    siteCache.set(data.cabangId, { at: Date.now(), data: result });
    return result;
  });

export interface PengumumanItem {
  nama: string;
  cabang: string;
  status: string;
}

export interface PengumumanData {
  open: boolean;
  items: PengumumanItem[];
}

export const getPengumumanFn = createServerFn()
  .validator((data: unknown) => ({
    cabangId:
      typeof data === "object" && data !== null
        ? String((data as Record<string, unknown>).cabangId ?? "")
        : "",
  }))
  .handler(async ({ data }): Promise<PengumumanData> => {
    const key = `pg:${data.cabangId}`;
    const cached = umumCache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

    const [configRows, umumRows, siswaRows, cabangRows] = await Promise.all([
      gasGetRead("config"),
      gasGetRead("pengumuman"),
      gasGetRead("siswa"),
      gasGetRead("cabang"),
    ]);
    const config = mergeConfig(configRows, data.cabangId);
    // ponytail: kinder (PG/TK) tak ikut ujian tapi ikut diumumkan.
    let result: PengumumanData = { open: false, items: [] };
    if (config.umumkanHasil) {
      const namaById = new Map(
        siswaRows.map((r) => [str(r, "id"), str(r, "nama")]),
      );
      const cabangById = new Map(
        cabangRows.map((r) => [str(r, "id"), str(r, "nama")]),
      );
      const items = umumRows
        .filter((r) =>
          data.cabangId ? str(r, "cabang_id") === data.cabangId : true,
        )
        .map((r) => ({
          nama: namaById.get(str(r, "siswa_id")) ?? "-",
          cabang: cabangById.get(str(r, "cabang_id")) ?? "-",
          status: str(r, "status"),
        }));
      result = { open: true, items };
    }
    umumCache.set(key, { at: Date.now(), data: result });
    return result;
  });

const BOOL_KEYS: ConfigKey[] = [
  "show_jadwal",
  "show_kelas",
  "show_materi",
  "show_denah",
  "show_pengumuman",
  "countdown_enabled",
  "umumkan_hasil",
];

/** Tulis config — khusus admin, key di-whitelist, value divalidasi. */
export const setConfigFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const key = String(d.key ?? "");
    const value = String(d.value ?? "");
    const cabangId = String(d.cabangId ?? "");
    if (!(CONFIG_KEYS as readonly string[]).includes(key))
      throw new Error("key config tidak dikenal");
    if (BOOL_KEYS.includes(key as ConfigKey)) {
      if (!/^(true|false|1|0)$/i.test(value.trim()))
        throw new Error("value harus true/false");
    }
    if (key === "countdown_at" && value && Number.isNaN(Date.parse(value)))
      throw new Error("countdown_at harus tanggal valid");
    return { key, value: value.trim(), cabangId };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("admin");
    if (s?.role !== "admin") throw new Error("Hanya admin.");
    const existing = await gasPost("read", {
      table: "config",
      q: { key: data.key, cabang_id: data.cabangId },
    });
    const row = existing.rows?.[0];
    if (row?.id) {
      await gasPost("update", {
        table: "config",
        id: String(row.id),
        updates: { value: data.value },
      });
    } else {
      await gasPost("append", {
        table: "config",
        row: { key: data.key, value: data.value, cabang_id: data.cabangId },
      });
    }
    clearSiteCache();
    return { ok: true as const };
  });

export { DEFAULT_CONFIG };
