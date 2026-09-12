import { createServerFn } from "@tanstack/react-start";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { getSession } from "./session.server";

export interface NilaiItem {
  materi: string;
  skor: string;
}

export interface SiswaDashboard {
  nama: string;
  kode: string;
  jenjang: string;
  kelasTujuan: string;
  asalSekolah: string;
  statusUjian: string;
  selesai: boolean;
  nilai: NilaiItem[] | null;
  qr: string;
}

/** Profil + status + nilai (bila selesai) + QR tiket. */
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

    let nilai: NilaiItem[] | null = null;
    if (selesai) {
      const [nilaiRes, materiRes] = await Promise.all([
        gasPost("read", { table: "nilai", q: { siswa_id: String(row.id) } }),
        gasPost("read", { table: "materi" }),
      ]);
      const namaMateri = new Map(
        (materiRes.rows ?? []).map((m) => [String(m.id), String(m.nama ?? "")]),
      );
      nilai = (nilaiRes.rows ?? []).map((n) => ({
        materi: namaMateri.get(String(n.materi_id)) ?? "-",
        skor: String(n.skor ?? "-"),
      }));
    }

    const kode = String(row.kode ?? "");
    return {
      nama: String(row.nama ?? ""),
      kode,
      jenjang: String(row.jenjang ?? "-"),
      kelasTujuan: String(row.kelas_tujuan ?? "-"),
      asalSekolah: String(row.asal_sekolah ?? "-"),
      statusUjian: String(row.status_ujian ?? "terdaftar"),
      selesai,
      nilai,
      qr: await ticketQr(kode),
    };
  },
);
