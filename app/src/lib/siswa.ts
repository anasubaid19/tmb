import { createServerFn } from "@tanstack/react-start";
import { hadirHariIni, ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import {
  columnForMateri,
  olehColumnForMateri,
  petaPengampuMateri,
} from "./penguji";
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
  /** Hadir hari ini menurut tabel kedatangan (bukan kolom status_ujian). */
  hadir: boolean;
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
    // ponytail: badge kehadiran dibaca dari tabel kedatangan — kolom
    // status_ujian statis dan tak pernah ikut materi/scan selesai.
    const hadirRes = await gasPost("read", {
      table: "kedatangan",
      q: { kode_terdata: kode },
    });
    const hadir = hadirHariIni(
      (hadirRes.rows ?? []) as { kode_terdata: unknown; waktu: unknown }[],
      kode,
      Date.now(),
    );

    // ponytail: penguji per materi = pengampu materi via penguji.materi_id
    // (sumber "siapa menguji apa"); cabang jadi preferensi, bukan syarat —
    // impor personil mengosongkan penguji.cabang_id.
    const pengujiByMateri = petaPengampuMateri(pengujiRes.rows ?? [], cabangId);
    // ponytail: penguji yang benar-benar submit (kolom *_oleh) menang atas
    // pengampu di jadwal — paraf portal ikut penilai asli, bukan peta.
    const pengujiByKode = new Map(
      (pengujiRes.rows ?? []).map((p) => [String(p.kode ?? ""), p]),
    );
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
      const olehCol = olehColumnForMateri[materiId];
      const olehKode = olehCol ? String(row[olehCol] ?? "").trim() : "";
      const p =
        (olehKode ? pengujiByKode.get(olehKode) : undefined) ??
        pengujiByMateri.get(materiId);
      const nama = String(p?.nama ?? "");
      const kode = String(p?.kode ?? "");
      materiSelesai.push({
        label: namaMateri.get(materiId) ?? materiId,
        pengujiNama: nama || "-",
        pengujiKode: kode,
        qr: await ticketQr(`${kode} ${nama}`.trim()),
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
      hadir,
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
