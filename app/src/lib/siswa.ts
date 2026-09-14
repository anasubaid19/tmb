import { createServerFn } from "@tanstack/react-start";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { getSession } from "./session.server";

export interface SiswaDashboard {
  id: string;
  nama: string;
  kode: string;
  jenjang: string;
  kelasTujuan: string;
  programJurusan: string;
  statusUjian: string;
  selesai: boolean;
  qr: string;
}

/** Profil + status + QR tiket. Nilai internal — tak pernah ke siswa. */
export const getSiswaDashboardFn = createServerFn().handler(
  async (): Promise<SiswaDashboard> => {
    const s = await getSession();
    if (s?.role !== "siswa") throw new Error("Hanya siswa.");
    const res = await gasPost("read", {
      table: "siswa",
      q: { id: s.sub },
    });
    const row = res.rows?.[0];
    if (!row) throw new Error("Data siswa tidak ditemukan.");
    const selesai = String(row.status_ujian ?? "") === "selesai";

    const kode = String(row.kode ?? "");
    return {
      id: String(row.id),
      nama: String(row.nama ?? ""),
      kode,
      jenjang: String(row.jenjang ?? "-"),
      kelasTujuan: String(row.kelas_tujuan ?? "-"),
      programJurusan: String(row.program_jurusan ?? "-"),
      statusUjian: String(row.status_ujian ?? "terdaftar"),
      selesai,
      qr: await ticketQr(kode),
    };
  },
);
