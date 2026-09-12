import { createServerFn } from "@tanstack/react-start";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { ticketKode } from "./kode";
import { normalizePhone } from "./phone";
import { getSessionOr } from "./session.server";

export interface AdminSiswa {
  id: string;
  kode: string;
  nama: string;
  cabangId: string;
  jenjang: string;
  kelasTujuan: string;
  asalSekolah: string;
  noHp: string;
  statusUjian: string;
  hadir: boolean;
}

export interface AdminPenguji {
  nama: string;
  kode: string;
  cabangId: string;
  hadir: boolean;
  dinilai: number;
}

export interface AdminDashboard {
  cabang: { id: string; nama: string }[];
  siswa: AdminSiswa[];
  materi: { id: string; nama: string }[];
  nilaiBySiswa: Record<string, Record<string, string>>;
  fotoAda: Record<string, boolean>;
  penguji: AdminPenguji[];
  config: { key: string; value: string; cabangId: string }[];
  pengumuman: Record<string, string>;
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
    const [
      cabangRes,
      siswaRes,
      materiRes,
      nilaiRes,
      hadirRes,
      pengujiRes,
      jadwalRes,
      configRes,
      umumRes,
    ] = await Promise.all([
      gasPost("read", { table: "cabang" }),
      gasPost("read", { table: "siswa" }),
      gasPost("read", { table: "materi" }),
      gasPost("read", { table: "nilai" }),
      gasPost("read", { table: "kedatangan" }),
      gasPost("read", { table: "penguji" }),
      gasPost("read", { table: "jadwal" }),
      gasPost("read", { table: "config" }),
      gasPost("read", { table: "pengumuman" }),
    ]);

    const hadirSet = new Set(
      (hadirRes.rows ?? []).map((h) => String(h.kode_terdata ?? "")),
    );
    const nilaiBySiswa: Record<string, Record<string, string>> = {};
    const fotoAda: Record<string, boolean> = {};
    for (const n of nilaiRes.rows ?? []) {
      const sid = String(n.siswa_id ?? "");
      if (!nilaiBySiswa[sid]) nilaiBySiswa[sid] = {};
      if (String(n.skor ?? ""))
        nilaiBySiswa[sid][String(n.materi_id ?? "")] = String(n.skor);
      if (n.foto_path) fotoAda[sid] = true;
    }

    const jadwalByPenguji = new Map<string, string[]>();
    for (const j of jadwalRes.rows ?? []) {
      const pid = String(j.penguji_id ?? "");
      if (!jadwalByPenguji.has(pid)) jadwalByPenguji.set(pid, []);
      jadwalByPenguji.get(pid)?.push(String(j.id));
    }
    const dinilaiByJadwal = new Map<string, Set<string>>();
    for (const n of nilaiRes.rows ?? []) {
      const jid = String(n.jadwal_id ?? "");
      if (!dinilaiByJadwal.has(jid)) dinilaiByJadwal.set(jid, new Set());
      if (String(n.skor ?? ""))
        dinilaiByJadwal.get(jid)?.add(String(n.siswa_id ?? ""));
    }

    const siswa: AdminSiswa[] = (siswaRes.rows ?? [])
      .map((w) => ({
        id: String(w.id),
        kode: String(w.kode ?? ""),
        nama: String(w.nama ?? ""),
        cabangId: String(w.cabang_id ?? ""),
        jenjang: String(w.jenjang ?? ""),
        kelasTujuan: String(w.kelas_tujuan ?? ""),
        asalSekolah: String(w.asal_sekolah ?? ""),
        noHp: String(w.no_hp_wali ?? ""),
        statusUjian: String(w.status_ujian ?? "belum"),
        hadir: hadirSet.has(String(w.kode ?? "")),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    const penguji: AdminPenguji[] = (pengujiRes.rows ?? []).map((p) => {
      const jids = jadwalByPenguji.get(String(p.id)) ?? [];
      const dinilai = new Set<string>();
      for (const jid of jids)
        for (const s of dinilaiByJadwal.get(jid) ?? []) dinilai.add(s);
      return {
        nama: String(p.nama ?? ""),
        kode: String(p.kode ?? ""),
        cabangId: String(p.cabang_id ?? ""),
        hadir: hadirSet.has(String(p.kode ?? "")),
        dinilai: dinilai.size,
      };
    });

    const pengumuman: Record<string, string> = {};
    for (const u of umumRes.rows ?? [])
      pengumuman[String(u.siswa_id ?? "")] = String(u.status ?? "");

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
      nilaiBySiswa,
      fotoAda,
      penguji,
      config: (configRes.rows ?? []).map((c) => ({
        key: String(c.key ?? ""),
        value: String(c.value ?? ""),
        cabangId: String(c.cabang_id ?? ""),
      })),
      pengumuman,
    };
  },
);

/** Daftar on-the-spot: langsung bisa login + QR aktif, status belum. */
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
    return {
      nama,
      noHp,
      cabangId,
      jenjang: str("jenjang").toUpperCase(),
      kelasTujuan: str("kelasTujuan"),
      asalSekolah: str("asalSekolah"),
    };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const dupe = await gasPost("read", {
      table: "siswa",
      q: { nama: data.nama, no_hp_wali: data.noHp },
    });
    if (dupe.rows?.[0]) throw new Error("Siswa ini sudah terdaftar.");
    // ponytail: next = jumlah+1 per cabang+jenjang; collision hanya bila baris dihapus manual.
    const existing = await gasPost("read", {
      table: "siswa",
      q: { cabang_id: data.cabangId, jenjang: data.jenjang },
    });
    const kode = ticketKode(
      data.cabangId,
      data.jenjang,
      (existing.rows ?? []).length + 1,
    );
    const appended = await gasPost("append", {
      table: "siswa",
      row: {
        kode,
        nama: data.nama,
        cabang_id: data.cabangId,
        jenjang: data.jenjang,
        kelas_tujuan: data.kelasTujuan,
        asal_sekolah: data.asalSekolah,
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
