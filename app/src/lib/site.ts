import { createServerFn } from "@tanstack/react-start";
import { dbStatus } from "./db.server";
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
  "umumkan_hasil_at",
  "math_gform_url",
  "uji_cabang",
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
  /** Waktu buka otomatis pengumuman (WIB/ISO); kosong = manual saja. */
  umumkanHasilAt: string;
  /** URL Google Form Math SMP/SMA (CMS; kosong = belum diisi). */
  mathGformUrl: string;
}

const DEFAULT_CONFIG: SiteConfig = {
  showJadwal: true,
  showKelas: true,
  showMateri: true,
  showDenah: true,
  showPengumuman: true,
  countdownEnabled: false,
  countdownAt: "",
  umumkanHasil: false,
  umumkanHasilAt: "",
  mathGformUrl: "",
};

const str = (row: GasRow, key: string): string => String(row[key] ?? "").trim();

export const isTrue = (v: string): boolean =>
  v.trim().toLowerCase() === "true" || v.trim() === "1";

// ponytail: urutan cabang sesuai nomor (AW2 < AW10), bukan leksikografis
// (AW1, AW10, AW11…) — stdlib numeric collation, satu fungsi untuk semua daftar.
export const compareCabangId = (a: string, b: string): number =>
  a.localeCompare(b, "id", { numeric: true });

// ponytail: cabang ikut diuji kecuali ada baris `uji_cabang` yang mematikannya
// (pola config: baris per-cabang menimpa global; tak ada baris = ikut).
export function isCabangDiuji(rows: GasRow[], cabangId: string): boolean {
  const pick = (cid: string): string => {
    const r = rows.find(
      (x) => str(x, "key") === "uji_cabang" && str(x, "cabang_id") === cid,
    );
    return r ? str(r, "value") : "";
  };
  const v = pick(cabangId) || pick("");
  return v === "" ? true : isTrue(v);
}

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
    showDenah: pick("show_denah") === "" ? true : isTrue(pick("show_denah")),
    showPengumuman:
      pick("show_pengumuman") === "" ? true : isTrue(pick("show_pengumuman")),
    countdownEnabled: isTrue(pick("countdown_enabled")),
    countdownAt: pick("countdown_at"),
    umumkanHasil: isTrue(pick("umumkan_hasil")),
    umumkanHasilAt: pick("umumkan_hasil_at"),
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

/** Skema waktu ujian — satu-satunya sumber label sesi (admin + seed + portal). */
export const SESI_UJIAN = [
  { sesi: "Sesi 1", jenjang: "SD", waktu: "07.30–08.30" },
  { sesi: "Sesi 2", jenjang: "SMP & SMA (Akhwat)", waktu: "09.15–10.15" },
  { sesi: "Sesi 3", jenjang: "SMP & SMA (Ikhwan)", waktu: "11.00–12.00" },
] as const;

/** Label sesi tersimpan di kolom jadwal.sesi, mis. "Sesi 1 (07.30–08.30)". */
export const sesiLabel = (s: (typeof SESI_UJIAN)[number]): string =>
  `${s.sesi} (${s.waktu})`;

export interface SesiView {
  sesi: string;
  jenjang: string;
  waktu: string;
}

// ponytail: skema sesi kanonik dari tabel `sesi` (pola config: baris global
// cabang_id kosong, baris per-cabang menimpa). Tabel kosong = default
// SESI_UJIAN agar landing lama tetap tampil sebelum tab sesi diisi.
export function mergeSesi(rows: GasRow[], cabangId: string): SesiView[] {
  const shown = (r: GasRow): boolean => {
    const t = str(r, "tampil");
    return t === "" || isTrue(t);
  };
  return SESI_UJIAN.map((d): SesiView | null => {
    const specific = rows.find(
      (r) => str(r, "sesi") === d.sesi && str(r, "cabang_id") === cabangId,
    );
    const row =
      specific ??
      rows.find((r) => str(r, "sesi") === d.sesi && !str(r, "cabang_id"));
    if (row && !shown(row)) return null;
    return {
      sesi: d.sesi,
      jenjang: row ? str(row, "jenjang") || d.jenjang : d.jenjang,
      waktu: row ? str(row, "waktu") || d.waktu : d.waktu,
    };
  }).filter((s): s is SesiView => s !== null);
}

export interface SiteData {
  cabang: Cabang[];
  current: Cabang;
  config: SiteConfig;
  jadwal: JadwalView[];
  /** Skema sesi kanonik (sumber landing umum) — dari tabel `sesi`. */
  sesi: SesiView[];
  kelas: { id: string; nama: string; jenjang: string }[];
  materi: { id: string; nama: string; durasi: string; deskripsi: string }[];
  denah: { id: string; keterangan: string }[];
}

// ponytail: cache memori 60 dtk, satu proses Bun di VPS. Invalidasi saat admin menyimpan config.
const CACHE_TTL_MS = 60_000;
const siteCache = new Map<string, { at: number; data: SiteData }>();
const umumCache = new Map<string, { at: number; data: PengumumanData }>();

export function clearSiteCache(): void {
  siteCache.clear();
  umumCache.clear();
}

// ponytail: refresh saat SSR menggantung (HP/latensi) menumpang wave GAS yang
// sedang berjalan untuk kunci yang sama, bukan mengulang dari nol. Entri
// dihapus setelah settle; cache hanya ditulis saat sukses oleh pemanggil.
const siteFlight = new Map<string, Promise<SiteData>>();
const umumFlight = new Map<string, Promise<PengumumanData>>();

// ponytail: diekspor untuk satu test dedup (site.test.ts).
export async function withFlight<T>(
  flight: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const ongoing = flight.get(key);
  if (ongoing) return ongoing;
  const p = load();
  flight.set(key, p);
  try {
    return await p;
  } finally {
    flight.delete(key);
  }
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

/** Status koneksi database publik (bukan rahasia) — untuk indikator global. */
export const getGasStatusFn = createServerFn().handler(async () => {
  const db = dbStatus();
  return { connected: db.connected, source: db.source };
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
    return withFlight(siteFlight, data.cabangId, () =>
      loadSiteData(data.cabangId),
    );
  });

async function loadSiteData(cabangId: string): Promise<SiteData> {
  const [
    cabangRows,
    configRows,
    jadwalRows,
    sesiRows,
    kelasRows,
    materiRows,
    denahRows,
    pengujiRows,
  ] = await Promise.all([
    gasGetRead("cabang"),
    gasGetRead("config"),
    gasGetRead("jadwal"),
    // ponytail: tab `sesi` belum ada di sheet lama/deploy lama → anggap
    // kosong (fallback SESI_UJIAN), jangan jatuhkan seluruh landing.
    gasGetRead("sesi").catch((): GasRow[] => []),
    gasGetRead("kelas"),
    gasGetRead("materi"),
    gasGetRead("denah"),
    gasGetRead("penguji"),
  ]);

  const semuaCabang = cabangRows
    .map(toCabang)
    .filter((c) => c.id)
    .sort((a, b) => compareCabangId(a.id, b.id));
  const current =
    semuaCabang.find((c) => c.id === cabangId) ??
    semuaCabang.find((c) => c.portal) ??
    semuaCabang[0];
  // ponytail: cabang yang dimatikan admin (uji_cabang=false) hilang dari daftar
  // landing/portal, tapi tautan langsungnya tetap tampil (current tak difilter).
  const cabang = semuaCabang.filter((c) => isCabangDiuji(configRows, c.id));
  if (!current) throw new Error("Data cabang belum diisi.");
  // ponytail: ?cabang= kosong = landing UMUM — tampilkan data semua cabang
  // (bukan terpaku ke cabang portal). ?cabang= terisi = tampilkan per-cabang.
  const general = !cabangId;
  const inCabang = (r: GasRow) =>
    general ? true : !str(r, "cabang_id") || str(r, "cabang_id") === current.id;
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
    sesi: mergeSesi(sesiRows, general ? "" : current.id),
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
    // ponytail: denah dirender dari berkas SVG global (bukan per-cabang);
    // baris `denah` hanya menyumbang catatan tambahan.
    denah: denahRows.filter(inCabangStrict).map((r) => ({
      id: str(r, "id"),
      keterangan: str(r, "keterangan"),
    })),
  };
  siteCache.set(cabangId, { at: Date.now(), data: result });
  return result;
}

export interface PengumumanItem {
  nama: string;
  jenjang: string;
  kelas: string;
  status: string;
  remarks: string;
}

export interface PengumumanCabang {
  id: string;
  nama: string;
  items: PengumumanItem[];
}

export interface PengumumanData {
  open: boolean;
  /** Waktu buka terjadwal (ISO) bila ada — indikator "diumumkan pada…". */
  openAt: string;
  cabang: PengumumanCabang[];
  total: number;
}

/** Terbuka bila toggle manual menyala ATAU waktu terjadwal sudah lewat. */
export function isUmumkanOpen(cfg: SiteConfig, now = Date.now()): boolean {
  if (cfg.umumkanHasil) return true;
  if (cfg.umumkanHasilAt) {
    const t = Date.parse(cfg.umumkanHasilAt);
    if (!Number.isNaN(t) && now >= t) return true;
  }
  return false;
}

export const getPengumumanFn = createServerFn()
  .validator((data: unknown) => ({
    cabangId:
      typeof data === "object" && data !== null
        ? String((data as Record<string, unknown>).cabangId ?? "")
        : "",
  }))
  .handler(async (): Promise<PengumumanData> => {
    const key = "pg:all";
    const cached = umumCache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;
    return withFlight(umumFlight, key, () => loadPengumuman());
  });

async function loadPengumuman(): Promise<PengumumanData> {
  const key = "pg:all";
  // ponytail: satu muat untuk semua tab — landing publik menampilkan tab per
  // cabang tanpa perlu reload; filter per-cabang dilakukan di klien.
  const [umumRows, cabangRows, configRows] = await Promise.all([
    gasGetRead("pengumuman"),
    gasGetRead("cabang"),
    gasGetRead("config"),
  ]);
  const cabangById = new Map(
    cabangRows.map((r) => [str(r, "id"), str(r, "nama")]),
  );
  const groups = new Map<string, PengumumanItem[]>();
  // ponytail: entri manual lama hanya punya siswa_id (tanpa nama) — baru
  // dibaca dari tabel siswa bila memang ada; impor F_4 mengisi nama langsung.
  const perluSiswa = umumRows.some(
    (r) => !str(r, "nama") && str(r, "siswa_id"),
  );
  const namaById = new Map<string, string>();
  if (perluSiswa) {
    for (const s of await gasGetRead("siswa")) {
      namaById.set(str(s, "id"), str(s, "nama"));
    }
  }
  for (const r of umumRows) {
    const nama = str(r, "nama") || namaById.get(str(r, "siswa_id")) || "";
    if (!nama) continue;
    const id = str(r, "cabang_id");
    const item: PengumumanItem = {
      nama,
      jenjang: str(r, "jenjang"),
      kelas: str(r, "kelas"),
      status: str(r, "status"),
      remarks: str(r, "remarks"),
    };
    const list = groups.get(id);
    if (list) list.push(item);
    else groups.set(id, [item]);
  }
  const now = Date.now();
  const cabang = [...groups]
    .map(([id, items]) => ({ id, nama: cabangById.get(id) ?? id, items }))
    .filter((g) => isUmumkanOpen(mergeConfig(configRows, g.id), now))
    .sort((a, b) => compareCabangId(a.id, b.id));
  const result: PengumumanData = {
    open: cabang.length > 0,
    openAt: mergeConfig(configRows, "").umumkanHasilAt,
    cabang,
    total: cabang.reduce(
      (n, g) => n + g.items.filter((i) => i.status === "lulus").length,
      0,
    ),
  };
  umumCache.set(key, { at: Date.now(), data: result });
  return result;
}

const BOOL_KEYS: ConfigKey[] = [
  "show_jadwal",
  "show_kelas",
  "show_materi",
  "show_denah",
  "show_pengumuman",
  "countdown_enabled",
  "umumkan_hasil",
  "uji_cabang",
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
    if (key === "umumkan_hasil_at" && value && Number.isNaN(Date.parse(value)))
      throw new Error("umumkan_hasil_at harus tanggal valid");
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
