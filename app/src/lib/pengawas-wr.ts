import { createServerFn } from "@tanstack/react-start";
import { type GasRow, gasPost } from "./gas.server";
import { getSessionOr } from "./session.server";
import { compareCabangId, isCabangDiuji } from "./site";
import { NILAI_SELESAI } from "./soal";

/** Pengawas WR (Written test/Math) hanya untuk jenjang SMP & SMA. Murni. */
export function isJenjangMath(jenjang: string): boolean {
  const j = jenjang.trim().toUpperCase();
  return j === "SMP" || j === "SMA";
}

export interface PengawasWrSiswa {
  id: string;
  kode: string;
  nama: string;
  cabangId: string;
  jenjang: string;
  kelasTujuan: string;
  ruangTes: string;
  sesi: string;
  pukul: string;
  hadir: boolean;
  /** nilai_calistung_math: NILAI_SELESAI bila sudah selesai, atau skor lama. */
  math: string;
  /** kode pengawas WR yang menandai selesai (untuk paraf 'mtk'). */
  mathOleh: string;
}

export interface PengawasWrDashboard {
  nama: string;
  kode: string;
  tugas: string;
  ruang: string;
  sesi: string;
  roster: PengawasWrSiswa[];
  cabang: { id: string; nama: string }[];
}

function mustString(data: unknown, key: string): string {
  const v =
    typeof data === "object" && data !== null
      ? String((data as Record<string, unknown>)[key] ?? "").trim()
      : "";
  if (!v) throw new Error(`${key} wajib diisi`);
  return v;
}

/** Roster Math SMP/SMA + status selesai — untuk dashboard Pengawas WR. */
export const getPengawasWrFn = createServerFn().handler(
  async (): Promise<PengawasWrDashboard> => {
    const s = await getSessionOr("panitia");
    if (s?.role !== "panitia" && s?.role !== "admin")
      throw new Error("Hanya panitia.");
    const [siswaRes, hadirRes, configRes, cabangRes] = await Promise.all([
      gasPost("read", { table: "siswa" }),
      gasPost("read", { table: "kedatangan" }),
      gasPost("read", { table: "config" }),
      gasPost("read", { table: "cabang" }),
    ]);
    // ponytail: tugas/ruang/sesi hanya ada untuk panitia (users); admin "-".
    const usersRes =
      s.role === "panitia"
        ? await gasPost("read", { table: "users", q: { kode: s.sub } })
        : { rows: [] as GasRow[] };
    const hadirSet = new Set(
      (hadirRes.rows ?? []).map((h) => String(h.kode_terdata ?? "")),
    );
    const roster: PengawasWrSiswa[] = (siswaRes.rows ?? [])
      .filter((w) =>
        isCabangDiuji(configRes.rows ?? [], String(w.cabang_id ?? "")),
      )
      .filter((w) => isJenjangMath(String(w.jenjang ?? "")))
      .map((w) => ({
        id: String(w.id ?? ""),
        kode: String(w.kode ?? ""),
        nama: String(w.nama ?? ""),
        cabangId: String(w.cabang_id ?? ""),
        jenjang: String(w.jenjang ?? ""),
        kelasTujuan: String(w.kelas_tujuan ?? ""),
        ruangTes: String(w.ruang_tes ?? ""),
        sesi: String(w.sesi ?? ""),
        pukul: String(w.pukul ?? ""),
        hadir: hadirSet.has(String(w.kode ?? "")),
        math: String(w.nilai_calistung_math ?? ""),
        mathOleh: String(w.nilai_calistung_math_oleh ?? ""),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    const cabangIds = new Set(roster.map((w) => w.cabangId));
    const namaCabang = new Map(
      (cabangRes.rows ?? []).map((c) => [
        String(c.id ?? ""),
        String(c.nama ?? ""),
      ]),
    );
    const me = usersRes.rows?.[0];
    return {
      nama: s.nama ?? "",
      kode: s.sub,
      tugas: String(me?.tugas ?? ""),
      ruang: String(me?.ruang ?? ""),
      sesi: String(me?.sesi ?? ""),
      roster,
      cabang: [...cabangIds]
        .filter(Boolean)
        .map((id) => ({ id, nama: namaCabang.get(id) || id }))
        .sort((a, b) => compareCabangId(a.id, b.id)),
    };
  },
);

/** Tandai siswa selesai ujian Math (WR) — nama pengawas ikut tercatat. */
export const savePengawasWrFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({ siswaId: mustString(data, "siswaId") }))
  .handler(async ({ data }) => {
    const s = await getSessionOr("panitia");
    if (s?.role !== "panitia" && s?.role !== "admin")
      throw new Error("Hanya panitia.");
    const res = await gasPost("read", {
      table: "siswa",
      q: { id: data.siswaId },
    });
    const row = res.rows?.[0];
    if (!row) throw new Error("Siswa tidak ditemukan.");
    if (!isJenjangMath(String(row.jenjang ?? "")))
      throw new Error("Pengawas WR hanya untuk jenjang SMP/SMA.");
    await gasPost("update", {
      table: "siswa",
      id: String(row.id ?? ""),
      updates: {
        nilai_calistung_math: NILAI_SELESAI,
        nilai_calistung_math_oleh: s.sub,
      },
    });
    return { ok: true as const, nama: String(row.nama ?? "") };
  });
