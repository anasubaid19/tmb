import { createServerFn } from "@tanstack/react-start";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { isJenjangValid, jenjangLetter, ticketKode } from "./kode";
import { columnForMateri } from "./penguji";
import { normalizePhone } from "./phone";
import { getSessionOr } from "./session.server";

export interface AdminSiswa {
  id: string;
  kode: string;
  nama: string;
  cabangId: string;
  jenjang: string;
  kelasTujuan: string;
  programJurusan: string;
  noHp: string;
  statusUjian: string;
  hadir: boolean;
}

export interface AdminPenguji {
  id: string;
  nama: string;
  kode: string;
  cabangId: string;
  /** tes yang diampu (satu materi per penguji). */
  materi: string;
  hadir: boolean;
  dinilai: number;
}

export interface AdminJadwal {
  id: string;
  cabangId: string;
  tanggal: string;
  sesi: string;
  materiId: string;
  materi: string;
  kelasId: string;
  kelas: string;
  ruang: string;
  pengujiId: string;
  penguji: string;
  tampil: boolean;
}

export interface AdminDashboard {
  cabang: { id: string; nama: string }[];
  siswa: AdminSiswa[];
  materi: { id: string; nama: string }[];
  kelas: { id: string; nama: string; cabangId: string }[];
  jadwal: AdminJadwal[];
  nilaiBySiswa: Record<string, Record<string, string>>;
  penguji: AdminPenguji[];
  config: { key: string; value: string; cabangId: string }[];
  pengumuman: Record<string, string>;
  gas: {
    connected: boolean;
    source: "env" | "file" | "none";
    url: string;
    tokenMasked: string;
  };
}

async function requireAdmin() {
  const s = await getSessionOr("admin");
  if (s?.role !== "admin") throw new Error("Hanya admin.");
  return s;
}

/** Seluruh data rekap + config + pengumuman. Sekali load, refresh manual. */
export const getAdminDashboardFn = createServerFn().handler(
  async (): Promise<AdminDashboard> => {
    await requireAdmin();
    const gas = (await import("./gas-settings.server")).gasStatus();
    const [
      cabangRes,
      siswaRes,
      materiRes,
      kelasRes,
      hadirRes,
      pengujiRes,
      jadwalRes,
      configRes,
      umumRes,
    ] = await Promise.all([
      gasPost("read", { table: "cabang" }),
      gasPost("read", { table: "siswa" }),
      gasPost("read", { table: "materi" }),
      gasPost("read", { table: "kelas" }),
      gasPost("read", { table: "kedatangan" }),
      gasPost("read", { table: "penguji" }),
      gasPost("read", { table: "jadwal" }),
      gasPost("read", { table: "config" }),
      gasPost("read", { table: "pengumuman" }),
    ]);

    const hadirSet = new Set(
      (hadirRes.rows ?? []).map((h) => String(h.kode_terdata ?? "")),
    );
    // ponytail: nilai = kolom di baris siswa (schema flat). Key per materi id.
    const nilaiBySiswa: Record<string, Record<string, string>> = {};
    for (const w of siswaRes.rows ?? []) {
      const sid = String(w.id ?? "");
      for (const [materiId, col] of Object.entries(columnForMateri)) {
        const skor = String(w[col] ?? "");
        if (!skor) continue;
        if (!nilaiBySiswa[sid]) nilaiBySiswa[sid] = {};
        nilaiBySiswa[sid][materiId] = skor;
      }
    }

    const jadwalByPenguji = new Map<string, string[]>();
    for (const j of jadwalRes.rows ?? []) {
      const pid = String(j.penguji_id ?? "");
      if (!jadwalByPenguji.has(pid)) jadwalByPenguji.set(pid, []);
      jadwalByPenguji.get(pid)?.push(String(j.id));
    }
    // ponytail: dinilai per penguji = siswa yang punya skor di kolom materi
    // yang diampu penguji tsb (dari jadwal miliknya).
    const materiByJadwal = new Map<string, string>();
    for (const j of jadwalRes.rows ?? [])
      materiByJadwal.set(String(j.id), String(j.materi_id ?? ""));
    const pengujiMateri = new Map<string, Set<string>>();
    for (const [pid, jids] of jadwalByPenguji) {
      const set = new Set<string>();
      for (const jid of jids) {
        const m = materiByJadwal.get(jid);
        if (m) set.add(m);
      }
      pengujiMateri.set(pid, set);
    }

    const siswa: AdminSiswa[] = (siswaRes.rows ?? [])
      .map((w) => ({
        id: String(w.id),
        kode: String(w.kode ?? ""),
        nama: String(w.nama ?? ""),
        cabangId: String(w.cabang_id ?? ""),
        jenjang: String(w.jenjang ?? ""),
        kelasTujuan: String(w.kelas_tujuan ?? ""),
        programJurusan: String(w.program_jurusan ?? ""),
        noHp: String(w.no_hp_wali ?? ""),
        statusUjian: String(w.status_ujian ?? "belum"),
        hadir: hadirSet.has(String(w.kode ?? "")),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    const penguji: AdminPenguji[] = (pengujiRes.rows ?? []).map((p) => {
      const materis = pengujiMateri.get(String(p.id)) ?? new Set<string>();
      const dinilai = new Set<string>();
      for (const sid of Object.keys(nilaiBySiswa)) {
        const skor = Object.fromEntries(
          [...materis].map((m) => [m, nilaiBySiswa[sid]?.[m]]),
        );
        if (Object.values(skor).some(Boolean)) dinilai.add(sid);
      }
      return {
        id: String(p.id),
        nama: String(p.nama ?? ""),
        kode: String(p.kode ?? ""),
        cabangId: String(p.cabang_id ?? ""),
        // ponytail: tes yang diampu = kolom penguji (satu materi per penguji).
        materi: String(p.materi_id ?? ""),
        hadir: hadirSet.has(String(p.kode ?? "")),
        dinilai: dinilai.size,
      };
    });

    const pengumuman: Record<string, string> = {};
    for (const u of umumRes.rows ?? [])
      pengumuman[String(u.siswa_id ?? "")] = String(u.status ?? "");

    // ponytail: nama relasi (materi/kelas/penguji) dilookup di server agar
    // tab Jadwal admin tinggal render; kolom tampil kosong = tampil.
    const materiById = new Map(
      (materiRes.rows ?? []).map((m) => [String(m.id), String(m.nama ?? "")]),
    );
    const kelasById = new Map(
      (kelasRes.rows ?? []).map((k) => [String(k.id), String(k.nama ?? "")]),
    );
    const pengujiById = new Map(
      (pengujiRes.rows ?? []).map((p) => [String(p.id), String(p.nama ?? "")]),
    );
    const isShown = (v: unknown) => {
      const t = String(v ?? "");
      return t === "" || t === "true" || t === "1";
    };
    const jadwal: AdminJadwal[] = (jadwalRes.rows ?? []).map((j) => ({
      id: String(j.id),
      cabangId: String(j.cabang_id ?? ""),
      tanggal: String(j.tanggal ?? ""),
      sesi: String(j.sesi ?? ""),
      materiId: String(j.materi_id ?? ""),
      materi: materiById.get(String(j.materi_id ?? "")) ?? "-",
      kelasId: String(j.kelas_id ?? ""),
      kelas: kelasById.get(String(j.kelas_id ?? "")) ?? "-",
      ruang: String(j.ruang ?? ""),
      pengujiId: String(j.penguji_id ?? ""),
      penguji: pengujiById.get(String(j.penguji_id ?? "")) ?? "-",
      tampil: isShown(j.tampil),
    }));

    return {
      cabang: (cabangRes.rows ?? []).map((c) => ({
        id: String(c.id),
        nama: String(c.nama ?? ""),
      })),
      siswa,
      materi: (materiRes.rows ?? []).map((m) => ({
        id: String(m.id),
        nama: String(m.nama ?? ""),
      })),
      kelas: (kelasRes.rows ?? []).map((k) => ({
        id: String(k.id),
        nama: String(k.nama ?? ""),
        cabangId: String(k.cabang_id ?? ""),
      })),
      jadwal,
      nilaiBySiswa,
      penguji,
      config: (configRes.rows ?? []).map((c) => ({
        key: String(c.key ?? ""),
        value: String(c.value ?? ""),
        cabangId: String(c.cabang_id ?? ""),
      })),
      pengumuman,
      gas,
    };
  },
);

/** Cabang untuk form daftar on-the-spot (panitia/admin). */
export const getRegisterContextFn = createServerFn().handler(
  async (): Promise<{ cabang: { id: string; nama: string }[] }> => {
    const s = await getSessionOr("panitia");
    if (s?.role !== "panitia" && s?.role !== "admin")
      throw new Error("Hanya panitia.");
    const res = await gasPost("read", { table: "cabang" });
    return {
      cabang: (res.rows ?? []).map((c) => ({
        id: String(c.id),
        nama: String(c.nama ?? ""),
      })),
    };
  },
);

/**
 * Daftar on-the-spot: langsung bisa login + QR aktif, status belum.
 * Dimiliki bersama admin & tim panitia (keduanya bertugas di lokasi).
 */
export const registerSiswaFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const str = (k: string) => String(d[k] ?? "").trim();
    const nama = str("nama");
    const cabangId = str("cabangId");
    if (!nama) throw new Error("Nama wajib diisi");
    if (!cabangId) throw new Error("Cabang wajib dipilih");
    const noHp = normalizePhone(str("noHp"));
    if (!noHp) throw new Error("No. HP wali wajib diisi");
    const jenjang = str("jenjang").toUpperCase();
    if (!isJenjangValid(jenjang)) throw new Error("Jenjang tidak valid");
    return {
      nama,
      noHp,
      cabangId,
      jenjang,
      kelasTujuan: str("kelasTujuan"),
      programJurusan: str("programJurusan"),
    };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("panitia");
    if (s?.role !== "panitia" && s?.role !== "admin")
      throw new Error("Hanya panitia.");
    const dupe = await gasPost("read", {
      table: "siswa",
      q: { nama: data.nama, no_hp_wali: data.noHp },
    });
    if (dupe.rows?.[0]) throw new Error("Siswa ini sudah terdaftar.");
    // ponytail: next = jumlah+1 per cabang+HURUF (selaras import_siswa);
    // hitung per huruf karena PG/TK-A/TK-B berbagi huruf K.
    const existing = await gasPost("read", {
      table: "siswa",
      q: { cabang_id: data.cabangId },
    });
    const letter = jenjangLetter(data.jenjang);
    const next =
      (existing.rows ?? []).filter(
        (r) => jenjangLetter(String(r.jenjang ?? "")) === letter,
      ).length + 1;
    const kode = ticketKode(data.cabangId, data.jenjang, next);
    const appended = await gasPost("append", {
      table: "siswa",
      row: {
        kode,
        nama: data.nama,
        cabang_id: data.cabangId,
        jenjang: data.jenjang,
        kelas_tujuan: data.kelasTujuan,
        program_jurusan: data.programJurusan,
        no_hp_wali: data.noHp,
        status_ujian: "belum",
      },
    });
    return {
      ok: true as const,
      kode,
      nama: data.nama,
      id: String(appended.row?.id ?? ""),
      qr: await ticketQr(kode),
    };
  });

/** Ubah status_ujian (belum/selesai). Selesai → nilai terbuka untuk wali. */
export const setStatusFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const siswaId = String(d.siswaId ?? "");
    const status = String(d.status ?? "");
    if (!siswaId) throw new Error("siswaId wajib diisi");
    if (status !== "belum" && status !== "selesai")
      throw new Error("status harus belum/selesai");
    return { siswaId, status };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await gasPost("update", {
      table: "siswa",
      id: data.siswaId,
      updates: { status_ujian: data.status },
    });
    return { ok: true as const };
  });

/** Toggle tampil/sembunyi satu baris jadwal di landing. Kolom tampil. */
export const setJadwalTampilFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const id = String(d.id ?? "");
    const tampil = String(d.tampil ?? "");
    if (!id) throw new Error("id wajib diisi");
    if (!/^(true|false|1|0)$/i.test(tampil.trim()))
      throw new Error("tampil harus true/false");
    return { id, tampil: tampil.trim() };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await gasPost("update", {
      table: "jadwal",
      id: data.id,
      updates: { tampil: data.tampil },
    });
    return { ok: true as const };
  });

/** Tambah/ubah satu baris jadwal (CMS admin). id kosong = baris baru. */
export const saveJadwalFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const str = (k: string) => String(d[k] ?? "").trim();
    const id = str("id");
    const cabangId = str("cabangId");
    const tanggal = str("tanggal");
    const sesi = str("sesi");
    const materiId = str("materiId");
    const kelasId = str("kelasId");
    const ruang = str("ruang");
    const pengujiId = str("pengujiId");
    if (!cabangId) throw new Error("Cabang wajib dipilih");
    if (!tanggal) throw new Error("Tanggal wajib diisi");
    if (!sesi) throw new Error("Sesi wajib diisi");
    if (!materiId) throw new Error("Materi wajib dipilih");
    if (!kelasId) throw new Error("Kelas wajib dipilih");
    return { id, cabangId, tanggal, sesi, materiId, kelasId, ruang, pengujiId };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    if (data.id) {
      await gasPost("update", {
        table: "jadwal",
        id: data.id,
        updates: {
          cabang_id: data.cabangId,
          tanggal: data.tanggal,
          sesi: data.sesi,
          materi_id: data.materiId,
          kelas_id: data.kelasId,
          ruang: data.ruang,
          penguji_id: data.pengujiId,
        },
      });
      return { ok: true as const, id: data.id };
    }
    const appended = await gasPost("append", {
      table: "jadwal",
      row: {
        cabang_id: data.cabangId,
        tanggal: data.tanggal,
        sesi: data.sesi,
        materi_id: data.materiId,
        kelas_id: data.kelasId,
        ruang: data.ruang,
        penguji_id: data.pengujiId,
        tampil: "true",
      },
    });
    return { ok: true as const, id: String(appended.row?.id ?? "") };
  });
/** Upsert status kelulusan per siswa (lulus/tidak_lulus). */
export const setPengumumanFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const siswaId = String(d.siswaId ?? "");
    const cabangId = String(d.cabangId ?? "");
    const status = String(d.status ?? "");
    if (!siswaId) throw new Error("siswaId wajib diisi");
    if (status !== "lulus" && status !== "tidak_lulus")
      throw new Error("status harus lulus/tidak_lulus");
    return { siswaId, cabangId, status };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const existing = await gasPost("read", {
      table: "pengumuman",
      q: { siswa_id: data.siswaId },
    });
    const row = existing.rows?.[0];
    if (row?.id) {
      await gasPost("update", {
        table: "pengumuman",
        id: String(row.id),
        updates: { status: data.status, cabang_id: data.cabangId },
      });
    } else {
      await gasPost("append", {
        table: "pengumuman",
        row: {
          siswa_id: data.siswaId,
          cabang_id: data.cabangId,
          status: data.status,
        },
      });
    }
    return { ok: true as const };
  });

/** Simpan konfigurasi GAS (URL+token) — khusus admin. Tersimpan lokal server. */
export const saveGasConfigFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const url = String(d.url ?? "").trim();
    const token = String(d.token ?? "").trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(url))
      throw new Error(
        "URL GAS tidak valid (harus URL deploy script.google.com).",
      );
    if (token.length < 8)
      throw new Error("Token terlalu pendek (min. 8 karakter).");
    return { url, token };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const gas = await import("./gas-settings.server");
    gas.saveGasSettingsFile(data.url, data.token);
    // Bersihkan cache app (site/feed/totals) agar langsung baca GAS asli.
    const { clearSiteCache } = await import("./site");
    clearSiteCache();
    const { resetCache } = await import("./attendance");
    resetCache();
    return { ok: true as const, status: gas.gasStatus() };
  });
