import { createServerFn } from "@tanstack/react-start";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { columnForMateri } from "./penguji";
import { getSession } from "./session.server";

/** Satu materi yang sudah diuji — untuk ditampilkan di portal siswa. */
export interface MateriSelesai {
  label: string;
  pengujiNama: string;
  pengujiKode: string;
  qr: string;
}

export interface SiswaDashboard {
  id: string;
  nama: string;
  kode: string;
  jenjang: string;
  kelasTujuan: string;
  programJurusan: string;
  statusUjian: string;
  selesai: boolean;
  /** Penugasan ruang dari file pendaftaran; kosong = belum ada. */
  ruangTes: string;
  lantaiTes: string;
  ruangOrtu: string;
  lantaiOrtu: string;
  sesi: string;
  pukul: string;
  tanggal: string;
  /** Materi yang sudah ada nilainya (paraf penguji + QR) — publik. */
  materiSelesai: MateriSelesai[];
  qr: string;
}

/** Profil + status + QR tiket. Nilai internal — tak pernah ke siswa. */
export const getSiswaDashboardFn = createServerFn().handler(
  async (): Promise<SiswaDashboard> => {
    const s = await getSession();
    if (s?.role !== "siswa") throw new Error("Hanya siswa.");
    const [res, materiRes, pengujiRes] = await Promise.all([
      gasPost("read", { table: "siswa", q: { id: s.sub } }),
      gasPost("read", { table: "materi" }),
      gasPost("read", { table: "penguji" }),
    ]);
    const row = res.rows?.[0];
    if (!row) throw new Error("Data siswa tidak ditemukan.");
    const selesai = String(row.status_ujian ?? "") === "selesai";
    const kode = String(row.kode ?? "");
    const cabangId = String(row.cabang_id ?? "");

    // ponytail: penguji per materi = penguji yang materi_id-nya sama & cabang
    // sama (sumber "siapa menguji apa", lebih andal dari tabel jadwal).
    const pengujiByMateri = new Map<string, { kode: string; nama: string }>();
    for (const p of pengujiRes.rows ?? []) {
      const mid = String(p.materi_id ?? "");
      if (!mid || String(p.cabang_id ?? "") !== cabangId) continue;
      if (!pengujiByMateri.has(mid))
        pengujiByMateri.set(mid, {
          kode: String(p.kode ?? ""),
          nama: String(p.nama ?? ""),
        });
    }
    const namaMateri = new Map(
      (materiRes.rows ?? []).map((m) => [
        String(m.id ?? ""),
        String(m.nama ?? ""),
      ]),
    );

    // ponytail: hanya 4 materi ujian (M1–M4); M5 interview orangtua beda alur.
    const materiSelesai: MateriSelesai[] = [];
    for (const [materiId, col] of Object.entries(columnForMateri)) {
      if (materiId === "M5") continue;
      if (!String(row[col] ?? "")) continue;
      const p = pengujiByMateri.get(materiId);
      materiSelesai.push({
        label: namaMateri.get(materiId) ?? materiId,
        pengujiNama: p?.nama ?? "-",
        pengujiKode: p?.kode ?? "",
        qr: await ticketQr(`${p?.kode ?? ""} ${p?.nama ?? ""}`.trim()),
      });
    }

    return {
      id: String(row.id),
      nama: String(row.nama ?? ""),
      kode,
      jenjang: String(row.jenjang ?? "-"),
      kelasTujuan: String(row.kelas_tujuan ?? "-"),
      programJurusan: String(row.program_jurusan ?? "-"),
      statusUjian: String(row.status_ujian ?? "terdaftar"),
      selesai,
      ruangTes: String(row.ruang_tes ?? ""),
      lantaiTes: String(row.lantai_tes ?? ""),
      ruangOrtu: String(row.ruang_ortu ?? ""),
      lantaiOrtu: String(row.lantai_ortu ?? ""),
      sesi: String(row.sesi ?? ""),
      pukul: String(row.pukul ?? ""),
      tanggal: String(row.tanggal ?? ""),
      materiSelesai,
      qr: await ticketQr(kode),
    };
  },
);
