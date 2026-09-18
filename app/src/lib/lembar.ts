import { createServerFn } from "@tanstack/react-start";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { columnForMateri } from "./penguji";
import { getSessionOr } from "./session.server";

/** 4 baris tes tetap sesuai template SVG halaman 1 (tanpa nilai — internal). */
export const LEMBAR_TESTS = [
  { key: "mtk", label: "Calistung / Math" },
  { key: "ing", label: "English" },
  { key: "arb", label: "Arabic" },
  { key: "qur", label: "Al-Qur'an (Tahsin & Hafalan)" },
] as const;

/** Maksimal foto interview orang tua per siswa (2 slot di halaman 2). */
export const LEMBAR_FOTO_MAX = 2;

export interface LembarTestRow {
  key: string;
  label: string;
  // ponytail: qr hanya diisi getLembarFn (butuh async); build murni tanpa qr.
  paraf: { nama: string; kode: string; qr?: string } | null;
}

export interface LembarData {
  peserta: {
    nama: string;
    kode: string;
    cabang: string;
    kelasJenjang: string;
    program: string;
  };
  tests: LembarTestRow[];
  interview: {
    nama: string;
    kode: string;
    qr: string;
    /** catatan penguji (nilai_ortu) — nilai TETAP tak dirender. */
    catatan: string;
  } | null;
  fotos: { path: string; dataUrl: string }[];
}

/**
 * Petakan baris nilai → 4 baris lembar via materi.lembar_key.
 * Paraf terisi = ada baris nilai (skor internal, tak pernah dirender).
 * Murni — diuji unit di lembar.test.ts.
 */
export function buildLembarTests(
  materi: { id: string; lembar_key?: string }[],
  nilai: { materi_id?: string; diisi_oleh?: string }[],
  namaPenguji: Map<string, string>,
): LembarTestRow[] {
  const keyByMateri = new Map(materi.map((m) => [m.id, m.lembar_key ?? ""]));
  return LEMBAR_TESTS.map((t) => {
    const hit = nilai.find(
      (n) => keyByMateri.get(String(n.materi_id ?? "")) === t.key,
    );
    const kode = String(hit?.diisi_oleh ?? "");
    return {
      key: t.key,
      label: t.label,
      paraf: hit && kode ? { nama: namaPenguji.get(kode) ?? kode, kode } : null,
    };
  });
}

/**
 * Kode penilai untuk paraf baris materi. M1 (Math/WR) memakai pencatat
 * pengawas WR bila ada; selainnya = pengampu materi. Murni — diuji unit.
 */
export function olehMateri(
  materiId: string,
  row: Record<string, unknown>,
  fallbackKode: string,
): string {
  if (materiId === "M1") {
    const oleh = String(row.nilai_calistung_math_oleh ?? "").trim();
    if (oleh) return oleh;
  }
  return fallbackKode;
}

function mustString(data: unknown, key: string): string {
  const v =
    typeof data === "object" && data !== null
      ? String((data as Record<string, unknown>)[key] ?? "").trim()
      : "";
  if (!v) throw new Error(`${key} wajib diisi`);
  return v;
}

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? `${process.cwd()}/server/uploads`;
}

async function readFotoDataUrl(fotoPath: string): Promise<string | null> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  try {
    const buf = await fs.readFile(
      path.join(uploadDir(), path.basename(fotoPath)),
    );
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function fotoPaths(row: Record<string, unknown>): string[] {
  try {
    const v = JSON.parse(String(row.foto_paths ?? "[]"));
    return Array.isArray(v) ? v.map(String).slice(0, LEMBAR_FOTO_MAX) : [];
  } catch {
    return [];
  }
}

export interface OrtuInterviewInput {
  kode: string;
  nama: string;
}

/**
 * Bangun bagian interview-ortu: paraf + catatan, TANPA nilai.
 * Prioritas identitas: baris lembar tervalidasi admin → penilai tersimpan
 * (nilai_ortu_oleh) → pengampu M5. Murni — diuji unit.
 */
export function buildOrtuInterview(
  row: Record<string, unknown>,
  tervalidasi: OrtuInterviewInput | null,
  cariNama: (kode: string) => string,
  pengampuKode: string,
): { nama: string; kode: string; catatan: string } | null {
  const catatan = String(row.nilai_ortu ?? "");
  const total = String(row.nilai_ortu_total ?? "");
  if (tervalidasi) return { ...tervalidasi, catatan };
  if (!total && !catatan) return null;
  const kode = String(row.nilai_ortu_oleh ?? "") || pengampuKode;
  if (!kode) return { nama: "", kode: "", catatan };
  return { nama: cariNama(kode), kode, catatan };
}

/** Lembar validasi 2 halaman — siswa pemilik atau admin. Skor tak ikut. */
export const getLembarFn = createServerFn()
  .validator((data: unknown) => ({ siswaId: mustString(data, "siswaId") }))
  .handler(async ({ data }): Promise<LembarData> => {
    const s = await getSessionOr("siswa");
    if (
      !s ||
      (s.role !== "admin" && !(s.role === "siswa" && s.sub === data.siswaId))
    )
      throw new Error("Tidak berhak.");

    const [
      siswaRes,
      cabangRes,
      materiRes,
      jadwalRes,
      pengujiRes,
      lembarRes,
      usersRes,
    ] = await Promise.all([
      gasPost("read", { table: "siswa", q: { id: data.siswaId } }),
      gasPost("read", { table: "cabang" }),
      gasPost("read", { table: "materi" }),
      gasPost("read", { table: "jadwal" }),
      gasPost("read", { table: "penguji" }),
      gasPost("read", { table: "lembar", q: { siswa_id: data.siswaId } }),
      gasPost("read", { table: "users" }),
    ]);
    const row = siswaRes.rows?.[0];
    if (!row) throw new Error("Data siswa tidak ditemukan.");

    const namaCabang =
      (cabangRes.rows ?? []).find(
        (c) => String(c.id ?? "") === String(row.cabang_id ?? ""),
      )?.nama ?? String(row.cabang_id ?? "-");
    const namaPenguji = new Map(
      (pengujiRes.rows ?? []).map((p) => [
        String(p.kode ?? ""),
        String(p.nama ?? ""),
      ]),
    );
    // ponytail: pengawas WR (panitia) tak ada di tabel penguji — gabung nama
    // panitia agar paraf 'mtk' menampilkan nama pemvalidasi, bukan kodenya.
    for (const u of usersRes.rows ?? []) {
      const kode = String(u.kode ?? "");
      if (kode && !namaPenguji.has(kode))
        namaPenguji.set(kode, String(u.nama ?? ""));
    }
    // ponytail: paraf lembar = ada skor di kolom nilai siswa (schema flat);
    // penguji yang ditampilkan = pengampu materi via penguji.materi_id
    // (sumber "siapa menguji apa"), fallback jadwal cabang siswa.
    const pengujiByMateri = new Map<string, string>();
    for (const p of pengujiRes.rows ?? []) {
      const mid = String(p.materi_id ?? "");
      if (!mid || String(p.cabang_id ?? "") !== String(row.cabang_id ?? ""))
        continue;
      if (!pengujiByMateri.has(mid))
        pengujiByMateri.set(mid, String(p.id ?? ""));
    }
    for (const j of jadwalRes.rows ?? []) {
      if (String(j.cabang_id ?? "") !== String(row.cabang_id ?? "")) continue;
      const m = String(j.materi_id ?? "");
      if (m && !pengujiByMateri.has(m))
        pengujiByMateri.set(m, String(j.penguji_id ?? ""));
    }
    const pengujiKodeById = new Map(
      (pengujiRes.rows ?? []).map((p) => [
        String(p.id ?? ""),
        String(p.kode ?? ""),
      ]),
    );
    const nilaiRows: { materi_id?: string; diisi_oleh?: string }[] = [];
    for (const [materiId, col] of Object.entries(columnForMateri)) {
      if (!String(row[col] ?? "")) continue;
      const pid = pengujiByMateri.get(materiId) ?? "";
      // ponytail: M1 Math ditandai pengawas WR (panitia) → pakai pencatatnya,
      // fallback ke pengampu materi bila kosong.
      nilaiRows.push({
        materi_id: materiId,
        diisi_oleh: olehMateri(materiId, row, pengujiKodeById.get(pid) ?? ""),
      });
    }
    const tests = buildLembarTests(
      (materiRes.rows ?? []).map((m) => ({
        id: String(m.id),
        lembar_key: String(m.lembar_key ?? ""),
      })),
      nilaiRows,
      namaPenguji,
    );
    const withQr = await Promise.all(
      tests.map(async (t) =>
        t.paraf
          ? {
              ...t,
              paraf: {
                ...t.paraf,
                qr: await ticketQr(`${t.paraf.kode} ${t.paraf.nama}`),
              },
            }
          : t,
      ),
    );

    const lem = lembarRes.rows?.[0];
    const kodeOrtu = String(lem?.diisi_oleh ?? "");
    const pid5 = pengujiByMateri.get("M5") ?? "";
    const ortu = buildOrtuInterview(
      row,
      lem && kodeOrtu
        ? { kode: kodeOrtu, nama: String(lem.nama_pengelola ?? kodeOrtu) }
        : null,
      (kode) => namaPenguji.get(kode) ?? kode,
      pengujiKodeById.get(pid5) ?? "",
    );
    const interview = ortu
      ? {
          ...ortu,
          qr: ortu.kode
            ? await ticketQr(`${ortu.kode} ${ortu.nama}`.trim())
            : "",
        }
      : null;
    const fotos: { path: string; dataUrl: string }[] = [];
    if (lem)
      for (const p of fotoPaths(lem)) {
        const dataUrl = await readFotoDataUrl(p);
        if (dataUrl) fotos.push({ path: p, dataUrl });
      }

    // ponytail: program jurusan = satu kolom gabungan (mis. FULLDAY · INTER).
    const program = String(row.program_jurusan ?? "").trim();
    return {
      peserta: {
        nama: String(row.nama ?? ""),
        kode: String(row.kode ?? ""),
        cabang: String(namaCabang ?? "-"),
        kelasJenjang: `Kelas ${String(row.kelas_tujuan ?? "-")} · ${String(row.jenjang ?? "-")}`,
        program: program || "-",
      },
      tests: withQr,
      interview,
      fotos,
    };
  });

async function requireAdmin() {
  const s = await getSessionOr("admin");
  if (s?.role !== "admin") throw new Error("Hanya admin.");
  return s;
}

/** Tandai interview orang tua tervalidasi — paraf atas nama admin pemvalidasi. */
export const saveInterviewLembarFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({ siswaId: mustString(data, "siswaId") }))
  .handler(async ({ data }) => {
    const s = await requireAdmin();
    const nama = String(s.nama ?? s.sub);
    const existing = await gasPost("read", {
      table: "lembar",
      q: { siswa_id: data.siswaId },
    });
    const row = existing.rows?.[0];
    if (row?.id) {
      await gasPost("update", {
        table: "lembar",
        id: String(row.id),
        updates: {
          diisi_oleh: s.sub,
          nama_pengelola: nama,
          ts: new Date().toISOString(),
        },
      });
    } else {
      await gasPost("append", {
        table: "lembar",
        row: {
          siswa_id: data.siswaId,
          diisi_oleh: s.sub,
          nama_pengelola: nama,
          foto_paths: "[]",
          ts: new Date().toISOString(),
        },
      });
    }
    return { ok: true as const, nama, kode: s.sub };
  });

const MAX_FOTO_BYTES = 1_500_000;

/** Upload foto interview → server/uploads, path masuk lembar.foto_paths. */
export const uploadInterviewFotoFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const siswaId = mustString(data, "siswaId");
    const dataUrl = mustString(data, "dataUrl");
    if (!/^data:image\/(jpeg|png);base64,/.test(dataUrl))
      throw new Error("Format foto harus JPEG/PNG");
    const bytes = Math.floor((dataUrl.length * 3) / 4);
    if (bytes > MAX_FOTO_BYTES) throw new Error("Foto maksimal 1,5 MB");
    return { siswaId, dataUrl };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const existing = await gasPost("read", {
      table: "lembar",
      q: { siswa_id: data.siswaId },
    });
    const row = existing.rows?.[0];
    const paths = row ? fotoPaths(row) : [];
    if (paths.length >= LEMBAR_FOTO_MAX)
      throw new Error(`Maksimal ${LEMBAR_FOTO_MAX} foto per siswa.`);

    const safe = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, "_");
    const filename = `i_${safe(data.siswaId)}_${Date.now()}.jpg`;
    const base64 = data.dataUrl.split(",", 2)[1] ?? "";
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.mkdir(uploadDir(), { recursive: true });
    await fs.writeFile(
      path.join(uploadDir(), filename),
      Buffer.from(base64, "base64"),
    );
    const fotoPath = `uploads/${filename}`;
    const next = JSON.stringify([...paths, fotoPath]);
    if (row?.id) {
      await gasPost("update", {
        table: "lembar",
        id: String(row.id),
        updates: { foto_paths: next, ts: new Date().toISOString() },
      });
    } else {
      await gasPost("append", {
        table: "lembar",
        row: {
          siswa_id: data.siswaId,
          diisi_oleh: "",
          nama_pengelola: "",
          foto_paths: next,
          ts: new Date().toISOString(),
        },
      });
    }
    return { ok: true as const, fotoPath };
  });

/** Hapus satu foto interview (path + file best-effort). */
export const deleteInterviewFotoFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({
    siswaId: mustString(data, "siswaId"),
    fotoPath: mustString(data, "fotoPath"),
  }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const existing = await gasPost("read", {
      table: "lembar",
      q: { siswa_id: data.siswaId },
    });
    const row = existing.rows?.[0];
    if (!row?.id) throw new Error("Data lembar tidak ditemukan.");
    const next = fotoPaths(row).filter((p) => p !== data.fotoPath);
    await gasPost("update", {
      table: "lembar",
      id: String(row.id),
      updates: { foto_paths: JSON.stringify(next) },
    });
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      await fs.unlink(path.join(uploadDir(), path.basename(data.fotoPath)));
    } catch {
      /* file sudah hilang — abaikan */
    }
    return { ok: true as const };
  });
