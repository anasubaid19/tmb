import { createServerFn } from "@tanstack/react-start";
import { ticketQr } from "./attendance";
import { syncControlData } from "./control-sync";
import { dbDelete, dbRead, dbStatus } from "./db.server";
import { DB_TABLES, type DbTable, isDbTable } from "./db-schema";
import { tableToCsv } from "./export-backup";
import { gasPost } from "./gas.server";
import { parseControlSheets } from "./import-control";
import {
  isJenjangValid,
  jenjangLetter,
  nextMateriId,
  nextPengujiKode,
  ticketKode,
} from "./kode";
import { columnForMateri } from "./penguji";
import { normalizePhone } from "./phone";
import { getSessionOr } from "./session.server";
import { compareCabangId } from "./site";

export interface AdminSiswa {
  id: string;
  kode: string;
  nama: string;
  cabangId: string;
  jenjang: string;
  kelasTujuan: string;
  programJurusan: string;
  noHp: string;
  email: string;
  jenisKelamin: string;
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

/** Akun panitia (baris tabel `users` ber-role panitia). */
export interface AdminPanitia {
  kode: string;
  nama: string;
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

export interface AdminSesi {
  id: string;
  /** kosong = global (semua cabang). */
  cabangId: string;
  sesi: string;
  jenjang: string;
  waktu: string;
  tampil: boolean;
}

export interface AdminMateri {
  id: string;
  /** kosong = global (semua cabang). */
  cabangId: string;
  nama: string;
  durasi: string;
  deskripsi: string;
  /** kunci baris lembar validasi (mtk/ing/arb/qur) atau kosong. */
  lembarKey: string;
}

export interface AdminDashboard {
  cabang: { id: string; nama: string }[];
  siswa: AdminSiswa[];
  materi: AdminMateri[];
  kelas: { id: string; nama: string; cabangId: string }[];
  jadwal: AdminJadwal[];
  sesi: AdminSesi[];
  nilaiBySiswa: Record<string, Record<string, string>>;
  penguji: AdminPenguji[];
  panitia: AdminPanitia[];
  config: { key: string; value: string; cabangId: string }[];
  pengumuman: Record<string, string>;
  gas: {
    connected: boolean;
    source: "env" | "file" | "postgres" | "none";
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
    const gas = dbStatus();
    const [
      cabangRes,
      siswaRes,
      materiRes,
      kelasRes,
      hadirRes,
      pengujiRes,
      usersRes,
      jadwalRes,
      sesiRes,
      configRes,
      umumRes,
    ] = await Promise.all([
      gasPost("read", { table: "cabang" }),
      gasPost("read", { table: "siswa" }),
      gasPost("read", { table: "materi" }),
      gasPost("read", { table: "kelas" }),
      gasPost("read", { table: "kedatangan" }),
      gasPost("read", { table: "penguji" }),
      gasPost("read", { table: "users" }),
      gasPost("read", { table: "jadwal" }),
      // ponytail: tab `sesi` belum ada di sheet lama → anggap kosong,
      // jangan jatuhkan seluruh dashboard admin.
      gasPost("read", { table: "sesi" }).catch(() => ({
        ok: true as const,
        rows: [],
      })),
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
        email: String(w.email ?? ""),
        jenisKelamin: String(w.jenis_kelamin ?? ""),
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
      cabang: (cabangRes.rows ?? [])
        .map((c) => ({
          id: String(c.id),
          nama: String(c.nama ?? ""),
        }))
        .sort((a, b) => compareCabangId(a.id, b.id)),
      siswa,
      materi: (materiRes.rows ?? []).map((m) => ({
        id: String(m.id),
        cabangId: String(m.cabang_id ?? ""),
        nama: String(m.nama ?? ""),
        durasi: String(m.durasi ?? ""),
        deskripsi: String(m.deskripsi ?? ""),
        lembarKey: String(m.lembar_key ?? ""),
      })),
      kelas: (kelasRes.rows ?? []).map((k) => ({
        id: String(k.id),
        nama: String(k.nama ?? ""),
        cabangId: String(k.cabang_id ?? ""),
      })),
      jadwal,
      sesi: (sesiRes.rows ?? []).map((s) => ({
        id: String(s.id),
        cabangId: String(s.cabang_id ?? ""),
        sesi: String(s.sesi ?? ""),
        jenjang: String(s.jenjang ?? ""),
        waktu: String(s.waktu ?? ""),
        tampil: isShown(s.tampil),
      })),
      nilaiBySiswa,
      penguji,
      panitia: (usersRes.rows ?? [])
        .filter((u) => String(u.role ?? "") === "panitia")
        .map((u) => ({
          kode: String(u.kode ?? ""),
          nama: String(u.nama ?? ""),
        }))
        .sort((a, b) => a.kode.localeCompare(b.kode, "id")),
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
      cabang: (res.rows ?? [])
        .map((c) => ({
          id: String(c.id),
          nama: String(c.nama ?? ""),
        }))
        .sort((a, b) => compareCabangId(a.id, b.id)),
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
    const email = str("email");
    if (email && !emailValid(email)) throw new Error("Email tidak valid");
    const jenjang = str("jenjang").toUpperCase();
    if (!isJenjangValid(jenjang)) throw new Error("Jenjang tidak valid");
    return {
      nama,
      noHp,
      email,
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
        email: data.email,
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

const MAX_CONTROL_BYTES = 8 * 1024 * 1024;

/**
 * Impor F_DATA CONTROL (.xlsx) langsung dari web. Upsert non-destruktif:
 * profil yang cocok di-update, siswa baru ditambah, status/nilai lama dan
 * baris yang tidak ada di file dibiarkan.
 */
export const importControlFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const dataUrl = String((data as Record<string, unknown>).dataUrl ?? "");
    if (
      !dataUrl.startsWith(
        "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,",
      )
    ) {
      throw new Error("File harus .xlsx F_DATA CONTROL.");
    }
    return { dataUrl };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const base64 = data.dataUrl.split(",", 2)[1] ?? "";
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0 || bytes.length > MAX_CONTROL_BYTES) {
      throw new Error("Ukuran file harus 1 byte–8 MB.");
    }
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(bytes, { type: "buffer" });
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      grid: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
        header: 1,
        raw: true,
        defval: null,
      }) as unknown[][],
    }));
    const parsed = parseControlSheets(sheets);
    const summary = await syncControlData(parsed);
    const { clearSiteCache } = await import("./site");
    clearSiteCache();
    return summary;
  });

/** Backup data: XLSX semua tabel, atau CSV per tabel. Khusus admin. */
export const exportBackupFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const format = String(d.format ?? "");
    const table = String(d.table ?? "");
    if (format !== "csv" && format !== "xlsx")
      throw new Error("format harus csv/xlsx");
    if (format === "csv" && !isDbTable(table))
      throw new Error("tabel tidak dikenal");
    return { format: format as "csv" | "xlsx", table };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    if (data.format === "csv") {
      const table = data.table as DbTable;
      const rows = await dbRead(table);
      return {
        filename: `tmb-${table}-${stamp}.csv`,
        mime: "text/csv",
        content: tableToCsv(table, rows),
      };
    }
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    for (const table of Object.keys(DB_TABLES) as DbTable[]) {
      const rows = await dbRead(table);
      const grid = [
        [...DB_TABLES[table]],
        ...rows.map((row) =>
          DB_TABLES[table].map((column) => String(row[column] ?? "")),
        ),
      ];
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(grid),
        table,
      );
    }
    const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
    return {
      filename: `tmb-backup-${stamp}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`,
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

/** Toggle tampil/sembunyi satu baris skema sesi di landing. Kolom tampil. */
export const setSesiTampilFn = createServerFn({ method: "POST" })
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
      table: "sesi",
      id: data.id,
      updates: { tampil: data.tampil },
    });
    return { ok: true as const };
  });

/** Tambah/ubah satu baris skema sesi kanonik (CMS admin). cabangId kosong =
 * global; id kosong = baris baru. */
export const saveSesiFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const str = (k: string) => String(d[k] ?? "").trim();
    const id = str("id");
    const cabangId = str("cabangId");
    const sesi = str("sesi");
    const jenjang = str("jenjang");
    const waktu = str("waktu");
    if (!sesi) throw new Error("Sesi wajib diisi");
    if (!jenjang) throw new Error("Jenjang wajib diisi");
    if (!waktu) throw new Error("Waktu wajib diisi");
    return { id, cabangId, sesi, jenjang, waktu };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    if (data.id) {
      await gasPost("update", {
        table: "sesi",
        id: data.id,
        updates: {
          cabang_id: data.cabangId,
          sesi: data.sesi,
          jenjang: data.jenjang,
          waktu: data.waktu,
        },
      });
      return { ok: true as const, id: data.id };
    }
    const appended = await gasPost("append", {
      table: "sesi",
      row: {
        cabang_id: data.cabangId,
        sesi: data.sesi,
        jenjang: data.jenjang,
        waktu: data.waktu,
        tampil: "true",
      },
    });
    return { ok: true as const, id: String(appended.row?.id ?? "") };
  });

/** Hapus satu baris skema sesi (CMS admin). Baris global yang hilang jatuh ke
 * default SESI_UJIAN bawaan; baris per-cabang yang hilang jatuh ke global. */
export const hapusSesiFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const id = str(data as Record<string, unknown>, "id");
    if (!id) throw new Error("id wajib diisi");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await dbDelete("sesi", data.id);
    await clearLandingCache();
    return { ok: true as const };
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

/* ---------------- CMS: edit manual siswa / penguji / panitia ---------------- */

const JK_VALUES = ["LAKI-LAKI", "PEREMPUAN"];
const str = (d: Record<string, unknown>, k: string) =>
  String(d[k] ?? "").trim();

/** Siswa boleh login tanpa kode (nomor HP / email), jadi email divalidasi. */
const emailValid = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function clearLandingCache() {
  const { clearSiteCache } = await import("./site");
  clearSiteCache();
}

/** Tambah/ubah satu baris siswa (CMS admin). id kosong = baris baru. */
export const saveSiswaFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const id = str(d, "id");
    const kode = str(d, "kode").toUpperCase();
    const nama = str(d, "nama");
    const cabangId = str(d, "cabangId");
    const jenjang = str(d, "jenjang").toUpperCase();
    const email = str(d, "email");
    const jenisKelamin = str(d, "jenisKelamin").toUpperCase();
    if (!kode) throw new Error("Kode wajib diisi");
    if (!nama) throw new Error("Nama wajib diisi");
    if (!cabangId) throw new Error("Cabang wajib dipilih");
    if (!isJenjangValid(jenjang)) throw new Error("Jenjang tidak valid");
    if (email && !emailValid(email)) throw new Error("Email tidak valid");
    if (jenisKelamin && !JK_VALUES.includes(jenisKelamin))
      throw new Error("Jenis kelamin tidak valid");
    return {
      id,
      kode,
      nama,
      cabangId,
      jenjang,
      kelasTujuan: str(d, "kelasTujuan"),
      programJurusan: str(d, "programJurusan"),
      noHp: normalizePhone(str(d, "noHp")),
      email,
      jenisKelamin,
    };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const row = {
      kode: data.kode,
      nama: data.nama,
      cabang_id: data.cabangId,
      jenjang: data.jenjang,
      kelas_tujuan: data.kelasTujuan,
      program_jurusan: data.programJurusan,
      no_hp_wali: data.noHp,
      email: data.email,
      jenis_kelamin: data.jenisKelamin,
    };
    if (data.id) {
      await gasPost("update", { table: "siswa", id: data.id, updates: row });
      await clearLandingCache();
      return { ok: true as const, id: data.id };
    }
    const appended = await gasPost("append", {
      table: "siswa",
      row: { ...row, status_ujian: "belum" },
    });
    await clearLandingCache();
    return { ok: true as const, id: String(appended.row?.id ?? "") };
  });

/** Hapus satu baris siswa (CMS admin). */
export const hapusSiswaFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const id = str(data as Record<string, unknown>, "id");
    if (!id) throw new Error("id wajib diisi");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await dbDelete("siswa", data.id);
    await clearLandingCache();
    return { ok: true as const };
  });

/**
 * Tambah/ubah satu baris materi (CMS admin). id kosong = baris baru.
 * `durasi` = label bebas ("45 menit") yang tampil di landing.
 */
export const saveMateriFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const id = str(d, "id");
    const nama = str(d, "nama");
    if (!nama) throw new Error("Nama materi wajib diisi");
    return {
      id,
      cabangId: str(d, "cabangId"),
      nama,
      durasi: str(d, "durasi"),
      deskripsi: str(d, "deskripsi"),
      lembarKey: str(d, "lembarKey"),
    };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const row = {
      cabang_id: data.cabangId,
      nama: data.nama,
      durasi: data.durasi,
      deskripsi: data.deskripsi,
      lembar_key: data.lembarKey,
    };
    if (data.id) {
      await gasPost("update", { table: "materi", id: data.id, updates: row });
      await clearLandingCache();
      return { ok: true as const, id: data.id };
    }
    const rows = await dbRead("materi");
    const id = nextMateriId(rows.map((r) => String(r.id ?? "")));
    await gasPost("append", { table: "materi", row: { id, ...row } });
    await clearLandingCache();
    return { ok: true as const, id };
  });

/**
 * Hapus materi (CMS admin). Materi inti M1–M5 dikunci: id-nya = kunci kolom
 * nilai di baris siswa (columnForMateri) + baris lembar validasi.
 */
export const hapusMateriFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const id = str(data as Record<string, unknown>, "id");
    if (!id) throw new Error("id wajib diisi");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    if (columnForMateri[data.id])
      throw new Error(
        "Materi inti (M1–M5) terhubung ke kolom nilai dan lembar validasi — tidak bisa dihapus.",
      );
    const [jadwal, penguji] = await Promise.all([
      dbRead("jadwal", { materi_id: data.id }),
      dbRead("penguji", { materi_id: data.id }),
    ]);
    if (jadwal[0] || penguji[0])
      throw new Error(
        "Materi masih dipakai di jadwal atau penguji — pindahkan dulu sebelum dihapus.",
      );
    await dbDelete("materi", data.id);
    await clearLandingCache();
    return { ok: true as const };
  });

/**
 * Tambah/ubah satu baris penguji (CMS admin). id kosong = baris baru.
 * Sekalian menyiapkan baris `users` (role penguji) agar bisa login pakai kode.
 */
export const savePengujiFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const id = str(d, "id");
    const kode = str(d, "kode").toUpperCase();
    const nama = str(d, "nama");
    if (!nama) throw new Error("Nama wajib diisi");
    // ponytail: kode auto-generated saat tambah (id kosong).
    return {
      id,
      kode,
      nama,
      cabangId: str(d, "cabangId"),
      materiId: str(d, "materiId"),
    };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    let kode = data.kode;
    if (!kode) {
      if (data.id) {
        const row = (await dbRead("penguji", { id: data.id }))[0];
        kode = String(row?.kode ?? "");
        if (!kode) throw new Error("Kode wajib diisi");
      } else {
        const rows = await dbRead("penguji");
        kode = nextPengujiKode((rows ?? []).map((r) => String(r.kode ?? "")));
        // ponytail: tabrakan kode login = fatal; loop sampai unik.
        while ((await dbRead("users", { kode }))[0])
          kode = nextPengujiKode([kode]);
      }
    }
    const row = {
      kode,
      nama: data.nama,
      cabang_id: data.cabangId,
      materi_id: data.materiId,
    };
    let id = data.id;
    if (id) {
      await gasPost("update", { table: "penguji", id, updates: row });
    } else {
      const appended = await gasPost("append", { table: "penguji", row });
      id = String(appended.row?.id ?? "");
    }
    const existing = await dbRead("users", { kode });
    if (existing[0]) {
      await gasPost("update", {
        table: "users",
        id: kode,
        updates: { nama: data.nama, role: "penguji", ref_id: id },
      });
    } else {
      await gasPost("append", {
        table: "users",
        row: {
          kode,
          nama: data.nama,
          role: "penguji",
          password: "",
          ref_id: id,
        },
      });
    }
    await clearLandingCache();
    return { ok: true as const, id };
  });

/** Hapus penguji + akun login-nya. */
export const hapusPengujiFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const id = str(data as Record<string, unknown>, "id");
    if (!id) throw new Error("id wajib diisi");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const row = (await dbRead("penguji", { id: data.id }))[0];
    await dbDelete("penguji", data.id);
    const kode = String(row?.kode ?? "");
    if (kode) {
      const account = await dbRead("users", { kode });
      if (account[0]) await dbDelete("users", kode);
    }
    await clearLandingCache();
    return { ok: true as const };
  });

/**
 * Tambah/ubah akun panitia (tabel `users`, role panitia). Kode = kunci.
 * ponytail: login panitia HANYA pakai kode (tanpa password) — field password
 * dihapus dari form & fungsi ini, karena tersimpan tapi tak pernah diperiksa.
 */
export const savePanitiaFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const kode = str(d, "kode").toUpperCase();
    const nama = str(d, "nama");
    if (!kode) throw new Error("Kode wajib diisi");
    if (!nama) throw new Error("Nama wajib diisi");
    return { kode, nama };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const existing = await dbRead("users", { kode: data.kode });
    const updates: Record<string, string> = {
      nama: data.nama,
      role: "panitia",
    };
    if (existing[0]) {
      await gasPost("update", {
        table: "users",
        id: data.kode,
        updates,
      });
    } else {
      await gasPost("append", {
        table: "users",
        row: {
          kode: data.kode,
          nama: data.nama,
          role: "panitia",
          ref_id: "",
        },
      });
    }
    return { ok: true as const, kode: data.kode };
  });

/** Hapus akun panitia. */
export const hapusPanitiaFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const kode = str(data as Record<string, unknown>, "kode");
    if (!kode) throw new Error("kode wajib diisi");
    return { kode };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await dbDelete("users", data.kode);
    return { ok: true as const };
  });
