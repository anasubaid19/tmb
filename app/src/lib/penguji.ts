import { createServerFn } from "@tanstack/react-start";
import { toDataURL } from "qrcode";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { getSessionOr } from "./session.server";
import { NILAI_SELESAI } from "./soal";

export interface TugasJadwal {
  id: string;
  materiId: string;
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

export interface PengujiDashboard {
  nama: string;
  kode: string;
  /** tes yang diampu penguji ini (satu materi). */
  materiDiampu: string;
  jadwal: TugasJadwal[];
  roster: RosterSiswa[];
  /** nilai per `${materiId}__${siswaId}` — dibaca dari kolom nilai di baris siswa. */
  nilai: Record<string, string>;
  qr: string;
  /** URL Google Form Math (CMS) + QR-nya untuk kolom soal. */
  gformUrl: string;
  gformQr: string;
}

function mustString(data: unknown, key: string): string {
  const v =
    typeof data === "object" && data !== null
      ? String((data as Record<string, unknown>)[key] ?? "").trim()
      : "";
  if (!v) throw new Error(`${key} wajib diisi`);
  return v;
}

/** Kolom nilai di sheet siswa untuk tiap materi (schema flat). */
export const columnForMateri: Record<string, string> = {
  M1: "nilai_calistung_math",
  M2: "nilai_english",
  M3: "nilai_arabic",
  M4: "nilai_quran",
  M5: "nilai_ortu",
};

async function myPengujiId(kode: string) {
  const res = await gasPost("read", { table: "penguji", q: { kode } });
  const row = res.rows?.[0];
  if (!row) throw new Error("Data penguji tidak ditemukan.");
  return {
    id: String(row.id),
    nama: String(row.nama ?? ""),
    materiId: String(row.materi_id ?? ""),
  };
}

export const getPengujiDashboardFn = createServerFn().handler(
  async (): Promise<PengujiDashboard> => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const me = await myPengujiId(s.sub);

    const [jadwalRes, materiRes, kelasRes, siswaRes, hadirRes, configRes] =
      await Promise.all([
        gasPost("read", { table: "jadwal" }),
        gasPost("read", { table: "materi" }),
        gasPost("read", { table: "kelas" }),
        gasPost("read", { table: "siswa" }),
        gasPost("read", { table: "kedatangan" }),
        gasPost("read", { table: "config" }),
      ]);

    const materiById = new Map(
      (materiRes.rows ?? []).map((m) => [
        String(m.id),
        { nama: String(m.nama ?? ""), deskripsi: String(m.deskripsi ?? "") },
      ]),
    );
    // ponytail: URL Google Form Math dari CMS (config global math_gform_url).
    const gformUrl = String(
      (configRes.rows ?? []).find(
        (c) =>
          String(c.key ?? "") === "math_gform_url" &&
          !String(c.cabang_id ?? ""),
      )?.value ?? "",
    ).trim();
    const kelasById = new Map(
      (kelasRes.rows ?? []).map((k) => [String(k.id), String(k.nama ?? "")]),
    );
    const hadirSet = new Set(
      (hadirRes.rows ?? []).map((h) => String(h.kode_terdata ?? "")),
    );

    const jadwal: TugasJadwal[] = (jadwalRes.rows ?? [])
      .filter((j) => String(j.penguji_id ?? "") === me.id)
      .map((j) => {
        const m = materiById.get(String(j.materi_id ?? ""));
        return {
          id: String(j.id),
          materiId: String(j.materi_id ?? ""),
          tanggal: String(j.tanggal ?? ""),
          sesi: String(j.sesi ?? ""),
          ruang: String(j.ruang ?? ""),
          materi: m?.nama ?? "-",
          materiDeskripsi: m?.deskripsi ?? "",
          kelas: kelasById.get(String(j.kelas_id ?? "")) ?? "-",
        };
      });

    // ponytail: penguji tanpa baris jadwal tetap harus melihat roster &
    // input nilai (materi diampunya ada di baris penguji, bukan hanya jadwal).
    // Sintesis satu entri jadwal dari materi_id penguji agar panel penilaian
    // punya materiId (tanpa tanggal/sesi/ruang = belum dijadwalkan admin).
    if (jadwal.length === 0 && me.materiId) {
      const m = materiById.get(me.materiId);
      jadwal.push({
        id: "",
        materiId: me.materiId,
        tanggal: "",
        sesi: "",
        ruang: "",
        materi: m?.nama ?? me.materiId,
        materiDeskripsi: m?.deskripsi ?? "",
        kelas: "-",
      });
    }

    // ponytail: nilai dibaca dari kolom di baris siswa (schema flat); kolom
    // yang dibaca = materi yang dijadwalkan ke penguji ini.
    const myMateri = new Set(jadwal.map((j) => j.materiId));
    const nilai: Record<string, string> = {};
    for (const w of siswaRes.rows ?? []) {
      const sid = String(w.id ?? "");
      for (const m of myMateri) {
        const skor = String(w[columnForMateri[m]] ?? "");
        if (skor) nilai[`${m}__${sid}`] = skor;
      }
    }

    // ponytail: semua penguji menguji semua siswa, tanpa batas cabang.
    const roster: RosterSiswa[] = (siswaRes.rows ?? [])
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
      materiDiampu: materiById.get(me.materiId)?.nama || me.materiId || "-",
      jadwal,
      roster,
      nilai,
      qr: await ticketQr(s.sub),
      gformUrl,
      gformQr: gformUrl
        ? await toDataURL(gformUrl, { width: 256, margin: 1 })
        : "",
    };
  },
);

/** Simpan nilai — penguji untuk siswa di cabangnya; kolom = materi (schema flat).
 * Bentuk nilai per materi: skor 0–100 (M1 Calistung SD, M2, M3, M4),
 * "SELESAI" (M1 Math SMP/SMA via Google Form), atau catatan bebas (M5). */
export const saveNilaiFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const siswaId = mustString(data, "siswaId");
    const materiId = mustString(data, "materiId");
    const skor = mustString(data, "skor");
    if (!["M1", "M2", "M3", "M4", "M5"].includes(materiId))
      throw new Error("Materi tidak valid untuk penguji.");
    // ponytail: M5 = catatan bebas; M1 Math = penanda selesai; sisanya angka.
    if (materiId === "M5") {
      if (skor.length > 500) throw new Error("Catatan terlalu panjang.");
    } else if (materiId === "M1" && skor === NILAI_SELESAI) {
      /* penanda sudah ujian via Google Form */
    } else if (
      !/^\d+(\.\d+)?$/.test(skor) ||
      Number(skor) < 0 ||
      Number(skor) > 100
    ) {
      throw new Error("Skor harus angka 0–100");
    }
    return { siswaId, materiId, skor };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const me = await myPengujiId(s.sub);

    // Pemilik jadwal: penguji ini harus mengampu materi tsb.
    // ponytail: penguji boleh mengampu materi yang tercatat di baris pengujinya
    // (materi_id) walau belum ada baris jadwal — penjadwalan admin menyusul.
    const [jadwalRes, siswaRes] = await Promise.all([
      gasPost("read", { table: "jadwal", q: { penguji_id: me.id } }),
      gasPost("read", { table: "siswa", q: { id: data.siswaId } }),
    ]);
    const mengampu =
      me.materiId === data.materiId ||
      (jadwalRes.rows ?? []).some(
        (j) => String(j.materi_id ?? "") === data.materiId,
      );
    if (!mengampu) throw new Error("Bukan materi yang Anda uji.");

    const row = siswaRes.rows?.[0];
    if (!row) throw new Error("Siswa tidak ditemukan.");

    await gasPost("update", {
      table: "siswa",
      id: String(row.id ?? ""),
      updates: { [columnForMateri[data.materiId]]: data.skor },
    });
    return { ok: true as const };
  });
