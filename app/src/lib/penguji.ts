import { createServerFn } from "@tanstack/react-start";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { getSessionOr } from "./session.server";

export interface TugasJadwal {
  id: string;
  tanggal: string;
  sesi: string;
  ruang: string;
  materi: string;
  materiDeskripsi: string;
  kelas: string;
}

export interface RosterSiswa {
  id: string;
  kode: string;
  nama: string;
  jenjang: string;
  kelasTujuan: string;
  statusUjian: string;
  hadir: boolean;
}

export interface NilaiEntry {
  nilaiId: string;
  skor: string;
  catatan: string;
  adaFoto: boolean;
}

export interface PengujiDashboard {
  nama: string;
  kode: string;
  jadwal: TugasJadwal[];
  roster: RosterSiswa[];
  nilai: Record<string, NilaiEntry>;
  qr: string;
}

function mustString(data: unknown, key: string): string {
  const v =
    typeof data === "object" && data !== null
      ? String((data as Record<string, unknown>)[key] ?? "").trim()
      : "";
  if (!v) throw new Error(`${key} wajib diisi`);
  return v;
}

async function myPengujiId(kode: string) {
  const res = await gasPost("read", { table: "penguji", q: { kode } });
  const row = res.rows?.[0];
  if (!row) throw new Error("Data penguji tidak ditemukan.");
  return { id: String(row.id), nama: String(row.nama ?? "") };
}

export const getPengujiDashboardFn = createServerFn().handler(
  async (): Promise<PengujiDashboard> => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const me = await myPengujiId(s.sub);

    const [jadwalRes, materiRes, kelasRes, siswaRes, hadirRes, nilaiRes] =
      await Promise.all([
        gasPost("read", { table: "jadwal" }),
        gasPost("read", { table: "materi" }),
        gasPost("read", { table: "kelas" }),
        gasPost("read", { table: "siswa" }),
        gasPost("read", { table: "kedatangan" }),
        gasPost("read", { table: "nilai" }),
      ]);

    const materiById = new Map(
      (materiRes.rows ?? []).map((m) => [
        String(m.id),
        { nama: String(m.nama ?? ""), deskripsi: String(m.deskripsi ?? "") },
      ]),
    );
    const kelasById = new Map(
      (kelasRes.rows ?? []).map((k) => [String(k.id), String(k.nama ?? "")]),
    );
    const hadirSet = new Set(
      (hadirRes.rows ?? []).map((h) => String(h.kode_terdata ?? "")),
    );

    const myJadwalId = new Set<string>();
    const jadwal: TugasJadwal[] = (jadwalRes.rows ?? [])
      .filter((j) => String(j.penguji_id ?? "") === me.id)
      .map((j) => {
        myJadwalId.add(String(j.id));
        const m = materiById.get(String(j.materi_id ?? ""));
        return {
          id: String(j.id),
          tanggal: String(j.tanggal ?? ""),
          sesi: String(j.sesi ?? ""),
          ruang: String(j.ruang ?? ""),
          materi: m?.nama ?? "-",
          materiDeskripsi: m?.deskripsi ?? "",
          kelas: kelasById.get(String(j.kelas_id ?? "")) ?? "-",
        };
      });

    const nilai: Record<string, NilaiEntry> = {};
    for (const n of nilaiRes.rows ?? []) {
      const jid = String(n.jadwal_id ?? "");
      if (!myJadwalId.has(jid)) continue;
      nilai[`${jid}__${String(n.siswa_id ?? "")}`] = {
        nilaiId: String(n.id),
        skor: String(n.skor ?? ""),
        catatan: String(n.catatan ?? ""),
        adaFoto: Boolean(n.foto_path),
      };
    }

    const cabangId = s.cabangId ?? "";
    const roster: RosterSiswa[] = (siswaRes.rows ?? [])
      .filter((w) => !cabangId || String(w.cabang_id ?? "") === cabangId)
      .map((w) => ({
        id: String(w.id),
        kode: String(w.kode ?? ""),
        nama: String(w.nama ?? ""),
        jenjang: String(w.jenjang ?? ""),
        kelasTujuan: String(w.kelas_tujuan ?? ""),
        statusUjian: String(w.status_ujian ?? "terdaftar"),
        hadir: hadirSet.has(String(w.kode ?? "")),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    return {
      nama: me.nama,
      kode: s.sub,
      jadwal,
      roster,
      nilai,
      qr: await ticketQr(s.sub),
    };
  },
);

/** Simpan/upsert nilai — penguji hanya untuk jadwal miliknya. */
export const saveNilaiFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const jadwalId = mustString(data, "jadwalId");
    const siswaId = mustString(data, "siswaId");
    const skor = mustString(data, "skor");
    if (!/^\d+(\.\d+)?$/.test(skor) || Number(skor) < 0 || Number(skor) > 100)
      throw new Error("Skor harus angka 0–100");
    const catatan =
      typeof data === "object" && data !== null
        ? String((data as Record<string, unknown>).catatan ?? "").slice(0, 500)
        : "";
    return { jadwalId, siswaId, skor, catatan };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const me = await myPengujiId(s.sub);

    const jadwalRes = await gasPost("read", {
      table: "jadwal",
      q: { id: data.jadwalId },
    });
    const jadwal = jadwalRes.rows?.[0];
    if (!jadwal || String(jadwal.penguji_id ?? "") !== me.id)
      throw new Error("Bukan jadwal Anda.");

    const existing = await gasPost("read", {
      table: "nilai",
      q: { siswa_id: data.siswaId, jadwal_id: data.jadwalId },
    });
    const row = existing.rows?.[0];
    if (row) {
      await gasPost("update", {
        table: "nilai",
        id: String(row.id),
        updates: {
          skor: data.skor,
          catatan: data.catatan,
          diisi_oleh: s.sub,
          ts: new Date().toISOString(),
        },
      });
      return { ok: true as const, nilaiId: String(row.id) };
    }
    const appended = await gasPost("append", {
      table: "nilai",
      row: {
        siswa_id: data.siswaId,
        jadwal_id: data.jadwalId,
        materi_id: String(jadwal.materi_id ?? ""),
        skor: data.skor,
        catatan: data.catatan,
        diisi_oleh: s.sub,
        ts: new Date().toISOString(),
      },
    });
    return { ok: true as const, nilaiId: String(appended.row?.id ?? "") };
  });

const MAX_FOTO_BYTES = 1_500_000;

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? `${process.cwd()}/server/uploads`;
}

/** Upload foto arsip → server/uploads, path tersimpan di nilai.foto_path. */
export const uploadFotoFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const jadwalId = mustString(data, "jadwalId");
    const siswaId = mustString(data, "siswaId");
    const dataUrl = mustString(data, "dataUrl");
    if (!/^data:image\/(jpeg|png);base64,/.test(dataUrl))
      throw new Error("Format foto harus JPEG/PNG");
    const bytes = Math.floor((dataUrl.length * 3) / 4);
    if (bytes > MAX_FOTO_BYTES) throw new Error("Foto maksimal 1,5 MB");
    return { jadwalId, siswaId, dataUrl };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const me = await myPengujiId(s.sub);

    const jadwalRes = await gasPost("read", {
      table: "jadwal",
      q: { id: data.jadwalId },
    });
    const jadwal = jadwalRes.rows?.[0];
    if (!jadwal || String(jadwal.penguji_id ?? "") !== me.id)
      throw new Error("Bukan jadwal Anda.");

    const safe = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, "_");
    const filename = `n_${safe(data.jadwalId)}_${safe(data.siswaId)}_${Date.now()}.jpg`;
    const base64 = data.dataUrl.split(",", 2)[1] ?? "";

    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.mkdir(uploadDir(), { recursive: true });
    await fs.writeFile(
      path.join(uploadDir(), filename),
      Buffer.from(base64, "base64"),
    );
    const fotoPath = `uploads/${filename}`;

    const existing = await gasPost("read", {
      table: "nilai",
      q: { siswa_id: data.siswaId, jadwal_id: data.jadwalId },
    });
    const row = existing.rows?.[0];
    if (row) {
      await gasPost("update", {
        table: "nilai",
        id: String(row.id),
        updates: { foto_path: fotoPath, diisi_oleh: s.sub },
      });
    } else {
      await gasPost("append", {
        table: "nilai",
        row: {
          siswa_id: data.siswaId,
          jadwal_id: data.jadwalId,
          materi_id: String(jadwal.materi_id ?? ""),
          skor: "",
          foto_path: fotoPath,
          diisi_oleh: s.sub,
          ts: new Date().toISOString(),
        },
      });
    }
    return { ok: true as const, fotoPath };
  });

/** Baca foto arsip sebagai data URL — penguji pemilik / admin. */
export const getFotoFn = createServerFn()
  .validator((data: unknown) => ({ nilaiId: mustString(data, "nilaiId") }))
  .handler(async ({ data }) => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji" && s?.role !== "admin")
      throw new Error("Tidak berhak.");
    const res = await gasPost("read", {
      table: "nilai",
      q: { id: data.nilaiId },
    });
    const row = res.rows?.[0];
    if (!row?.foto_path) return { dataUrl: null as string | null };
    if (s.role === "penguji") {
      const me = await myPengujiId(s.sub);
      const jadwalRes = await gasPost("read", {
        table: "jadwal",
        q: { id: String(row.jadwal_id ?? "") },
      });
      if (String(jadwalRes.rows?.[0]?.penguji_id ?? "") !== me.id)
        throw new Error("Bukan jadwal Anda.");
    }
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.join(uploadDir(), path.basename(String(row.foto_path)));
    try {
      const buf = await fs.readFile(file);
      return {
        dataUrl: `data:image/jpeg;base64,${buf.toString("base64")}` as
          | string
          | null,
      };
    } catch {
      return { dataUrl: null as string | null };
    }
  });
