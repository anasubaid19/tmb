import { createServerFn } from "@tanstack/react-start";
import { toDataURL } from "qrcode";
import { ticketQr } from "./attendance";
import { gasPost } from "./gas.server";
import { isAspekJenjang } from "./nilai-english";
import { parseOrtuAspek } from "./nilai-ortu";
import { getSessionOr } from "./session.server";
import { compareCabangId, isCabangDiuji, mergeConfig } from "./site";
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
  cabangId: string;
  jenjang: string;
  kelasTujuan: string;
  statusUjian: string;
  hadir: boolean;
  /** penugasan dari impor (ruang tes anak + sesi + pukul). */
  ruangTes: string;
  sesi: string;
  pukul: string;
}

export interface PengujiDashboard {
  nama: string;
  kode: string;
  /** tes yang diampu penguji ini (satu materi). */
  materiDiampu: string;
  /** plotting penguji sendiri dari impor personil. */
  tugasRuang: string;
  tugasSesi: string;
  jadwal: TugasJadwal[];
  roster: RosterSiswa[];
  /** daftar cabang untuk filter roster. */
  cabang: { id: string; nama: string }[];
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
    cabangId: String(row.cabang_id ?? ""),
    tugasRuang: String(row.ruang ?? ""),
    tugasSesi: String(row.sesi ?? ""),
  };
}

export const getPengujiDashboardFn = createServerFn().handler(
  async (): Promise<PengujiDashboard> => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const me = await myPengujiId(s.sub);

    const [
      jadwalRes,
      materiRes,
      kelasRes,
      siswaRes,
      hadirRes,
      configRes,
      cabangRes,
    ] = await Promise.all([
      gasPost("read", { table: "jadwal" }),
      gasPost("read", { table: "materi" }),
      gasPost("read", { table: "kelas" }),
      gasPost("read", { table: "siswa" }),
      gasPost("read", { table: "kedatangan" }),
      gasPost("read", { table: "config" }),
      gasPost("read", { table: "cabang" }),
    ]);

    const materiById = new Map(
      (materiRes.rows ?? []).map((m) => [
        String(m.id),
        { nama: String(m.nama ?? ""), deskripsi: String(m.deskripsi ?? "") },
      ]),
    );
    // ponytail: URL Google Form Math dari CMS. Dibaca lewat mergeConfig supaya
    // pengaturan per-cabang benar-benar berlaku (baris global sebagai fallback)
    // — sebelumnya hanya baris global yang dibaca, sehingga nilai per-cabang
    // tersimpan tapi diam-diam diabaikan.
    const gformUrl = mergeConfig(
      configRes.rows ?? [],
      me.cabangId,
    ).mathGformUrl;
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

    // ponytail: semua penguji menguji semua siswa; kecuali cabang yang
    // dimatikan admin via toggle CMS `uji_cabang` (siswa cabang itu dibuang).
    const roster: RosterSiswa[] = (siswaRes.rows ?? [])
      .filter((w) =>
        isCabangDiuji(configRes.rows ?? [], String(w.cabang_id ?? "")),
      )
      .map((w) => ({
        id: String(w.id),
        kode: String(w.kode ?? ""),
        nama: String(w.nama ?? ""),
        cabangId: String(w.cabang_id ?? ""),
        jenjang: String(w.jenjang ?? ""),
        kelasTujuan: String(w.kelas_tujuan ?? ""),
        statusUjian: String(w.status_ujian ?? "terdaftar"),
        hadir: hadirSet.has(String(w.kode ?? "")),
        ruangTes: String(w.ruang_tes ?? ""),
        sesi: String(w.sesi ?? ""),
        pukul: String(w.pukul ?? ""),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    // ponytail: daftar cabang untuk filter roster — hanya yang punya siswa
    // di roster (977 siswa), bukan seluruh tabel cabang.
    const cabangIds = new Set(roster.map((w) => w.cabangId));
    const namaCabang = new Map(
      (cabangRes.rows ?? []).map((c) => [
        String(c.id ?? ""),
        String(c.nama ?? ""),
      ]),
    );

    return {
      nama: me.nama,
      kode: s.sub,
      materiDiampu: materiById.get(me.materiId)?.nama || me.materiId || "-",
      tugasRuang: me.tugasRuang,
      tugasSesi: me.tugasSesi,
      jadwal,
      roster,
      cabang: [...cabangIds]
        .filter(Boolean)
        .map((id) => ({ id, nama: namaCabang.get(id) || id }))
        .sort((a, b) => compareCabangId(a.id, b.id)),
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

const ASPEK_ENGLISH_COLS = [
  "nilai_english_fluency",
  "nilai_english_vocab",
  "nilai_english_critical",
  "nilai_english_expression",
] as const;

const ASPEK_SANTRI_COLS = [
  "nilai_santri_sholat",
  "nilai_santri_quran",
  "nilai_santri_mapel",
  "nilai_santri_ortu",
] as const;

export interface NilaiSiswa {
  id: string;
  nama: string;
  kode: string;
  jenjang: string;
  kelasTujuan: string;
  cabangId: string;
  ruangTes: string;
  sesi: string;
  english: [string, string, string, string];
  santri: [string, string, string, string];
  arabAspek: [string, string, string, string];
  ortuAspek: [string, string, string, string, string];
  /** konteks materi penguji ini (untuk panel non-M2). */
  materiId: string;
  materiNama: string;
  materiDeskripsi: string;
  kelasLabel: string;
  gformUrl: string;
  gformQr: string;
  existingNilai: string;
}

/** Data halaman penilaian per siswa (penguji). */
export const getNilaiSiswaFn = createServerFn()
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    return { siswaId: String((data as Record<string, unknown>).siswaId ?? "") };
  })
  .handler(async ({ data }): Promise<NilaiSiswa> => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const me = await myPengujiId(s.sub);
    const [siswaRes, jadwalRes, materiRes, kelasRes, configRes] =
      await Promise.all([
        gasPost("read", { table: "siswa", q: { id: data.siswaId } }),
        gasPost("read", { table: "jadwal" }),
        gasPost("read", { table: "materi" }),
        gasPost("read", { table: "kelas" }),
        gasPost("read", { table: "config" }),
      ]);
    const row = siswaRes.rows?.[0];
    if (!row) throw new Error("Siswa tidak ditemukan.");
    const jadwal = (jadwalRes.rows ?? []).filter(
      (j) =>
        String(j.penguji_id ?? "") === me.id ||
        String(j.materi_id ?? "") === me.materiId,
    );
    const j0 = jadwal[0];
    const materiId = String(j0?.materi_id ?? me.materiId ?? "");
    const materi = (materiRes.rows ?? []).find(
      (m) => String(m.id ?? "") === materiId,
    );
    const kelas = (kelasRes.rows ?? []).find(
      (k) => String(k.id ?? "") === String(j0?.kelas_id ?? ""),
    );
    const gform = mergeConfig(configRes.rows ?? [], me.cabangId).mathGformUrl;
    const ambil4 = (
      cols: readonly string[],
    ): [string, string, string, string] =>
      cols.map((c) => String(row[c] ?? "")) as [string, string, string, string];
    const ambil5 = (
      cols: readonly string[],
    ): [string, string, string, string, string] =>
      cols.map((c) => String(row[c] ?? "")) as [
        string,
        string,
        string,
        string,
        string,
      ];
    return {
      id: String(row.id),
      nama: String(row.nama ?? ""),
      kode: String(row.kode ?? ""),
      jenjang: String(row.jenjang ?? ""),
      kelasTujuan: String(row.kelas_tujuan ?? ""),
      cabangId: String(row.cabang_id ?? ""),
      ruangTes: String(row.ruang_tes ?? ""),
      sesi: String(row.sesi ?? ""),
      english: ambil4(ASPEK_ENGLISH_COLS),
      santri: ambil4(ASPEK_SANTRI_COLS),
      arabAspek: ambil4(ASPEK_ARAB_COLS),
      ortuAspek: ambil5(ASPEK_ORTU_COLS),
      materiId,
      materiNama: String(materi?.nama ?? materiId),
      materiDeskripsi: String(materi?.deskripsi ?? ""),
      kelasLabel: String(kelas?.nama ?? "-"),
      gformUrl: gform,
      gformQr: gform ? await toDataURL(gform, { width: 256, margin: 1 }) : "",
      existingNilai:
        materiId && columnForMateri[materiId]
          ? String(row[columnForMateri[materiId]] ?? "")
          : "",
    };
  });

/**
 * Simpan 4 aspek English + 4 aspek santri (masing-masing 1–5). Total &
 * grade dihitung di server; total English → nilai_english, total santri →
 * nilai_santri. Hanya untuk materi M2 (yang mengampu English).
 */
export const saveAspekFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const siswaId = mustString(data, "siswaId");
    const num = (k: string): number => {
      const v = (d[k] as string | number | undefined) ?? "";
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 5)
        throw new Error("Tiap aspek wajib diisi 1–5.");
      return n;
    };
    return {
      siswaId,
      english: [
        num("english_fluency"),
        num("english_vocab"),
        num("english_critical"),
        num("english_expression"),
      ],
      santri: [
        num("santri_sholat"),
        num("santri_quran"),
        num("santri_mapel"),
        num("santri_ortu"),
      ],
    };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const me = await myPengujiId(s.sub);
    const [jadwalRes, siswaRes] = await Promise.all([
      gasPost("read", { table: "jadwal", q: { penguji_id: me.id } }),
      gasPost("read", { table: "siswa", q: { id: data.siswaId } }),
    ]);
    const mengampu =
      me.materiId === "M2" ||
      (jadwalRes.rows ?? []).some((j) => String(j.materi_id ?? "") === "M2");
    if (!mengampu) throw new Error("Bukan materi yang Anda uji.");
    const row = siswaRes.rows?.[0];
    if (!row) throw new Error("Siswa tidak ditemukan.");
    if (!isAspekJenjang(String(row.jenjang ?? "")))
      throw new Error("SD hanya Calistung + interview orangtua.");
    const totalEnglish = data.english.reduce((a, b) => a + b, 0);
    const totalSantri = data.santri.reduce((a, b) => a + b, 0);
    const updates: Record<string, string> = {
      [columnForMateri.M2]: String(totalEnglish),
      nilai_santri: String(totalSantri),
    };
    ASPEK_ENGLISH_COLS.forEach((col, i) => {
      updates[col] = String(data.english[i]);
    });
    ASPEK_SANTRI_COLS.forEach((col, i) => {
      updates[col] = String(data.santri[i]);
    });
    await gasPost("update", {
      table: "siswa",
      id: String(row.id ?? ""),
      updates,
    });
    return {
      ok: true as const,
      totalEnglish,
      totalSantri,
    };
  });

const ASPEK_ORTU_COLS = [
  "nilai_ortu_ibadah",
  "nilai_ortu_akhlak",
  "nilai_ortu_polaasuh",
  "nilai_ortu_belajar",
  "nilai_ortu_gadget",
] as const;

/**
 * Simpan 5 aspek interview orang tua (masing-masing 1–5). Total & grade
 * dihitung di server → nilai_ortu_total. Kolom nilai_ortu (catatan bebas)
 * tidak disentuh. Semua jenjang (SD/SMP/SMA ada interview ortu).
 */
export const saveOrtuFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    return {
      siswaId: mustString(data, "siswaId"),
      aspek: parseOrtuAspek(d),
    };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const siswaRes = await gasPost("read", {
      table: "siswa",
      q: { id: data.siswaId },
    });
    const row = siswaRes.rows?.[0];
    if (!row) throw new Error("Siswa tidak ditemukan.");
    const total = data.aspek.reduce((a, b) => a + b, 0);
    const updates: Record<string, string> = {
      nilai_ortu_total: String(total),
      nilai_ortu_oleh: s.sub,
    };
    ASPEK_ORTU_COLS.forEach((col, i) => {
      updates[col] = String(data.aspek[i]);
    });
    await gasPost("update", {
      table: "siswa",
      id: String(row.id ?? ""),
      updates,
    });
    return { ok: true as const, total };
  });

/** Aspek ortu tersimpan per siswa (prefill panel M5). */
export const getOrtuAspekFn = createServerFn()
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    return { siswaId: String((data as Record<string, unknown>).siswaId ?? "") };
  })
  .handler(async ({ data }): Promise<string[]> => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const res = await gasPost("read", {
      table: "siswa",
      q: { id: data.siswaId },
    });
    const row = res.rows?.[0];
    if (!row) throw new Error("Siswa tidak ditemukan.");
    return ASPEK_ORTU_COLS.map((c) => String(row[c] ?? ""));
  });

const ASPEK_ARAB_COLS = [
  "nilai_arabic_pd",
  "nilai_arabic_kelancaran",
  "nilai_arabic_kejelasan",
  "nilai_arabic_adab",
] as const;

/**
 * Simpan 4 aspek Arab (masing-masing bulat 1–25). Total = jumlah → nilai_arabic.
 * Hanya SMP/SMA (SD tak ada tes Arab).
 */
export const saveArabFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    const d = data as Record<string, unknown>;
    const vals = ["pd", "kelancaran", "kejelasan", "adab"].map((k) => {
      const n = Number(d[k] ?? "");
      if (!Number.isInteger(n) || n < 1 || n > 25)
        throw new Error("Tiap aspek wajib diisi 1–25.");
      return n;
    });
    return {
      siswaId: mustString(data, "siswaId"),
      aspek: vals,
    };
  })
  .handler(async ({ data }) => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const siswaRes = await gasPost("read", {
      table: "siswa",
      q: { id: data.siswaId },
    });
    const row = siswaRes.rows?.[0];
    if (!row) throw new Error("Siswa tidak ditemukan.");
    const jenjang = String(row.jenjang ?? "")
      .trim()
      .toUpperCase();
    if (jenjang !== "SMP" && jenjang !== "SMA")
      throw new Error("Tes Arab hanya untuk SMP/SMA.");
    const total = data.aspek.reduce((a, b) => a + b, 0);
    const updates: Record<string, string> = {
      [columnForMateri.M3]: String(total),
    };
    ASPEK_ARAB_COLS.forEach((col, i) => {
      updates[col] = String(data.aspek[i]);
    });
    await gasPost("update", {
      table: "siswa",
      id: String(row.id ?? ""),
      updates,
    });
    return { ok: true as const, total };
  });

/** Aspek Arab tersimpan per siswa (prefill panel M3). */
export const getArabAspekFn = createServerFn()
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("data tidak valid");
    return { siswaId: String((data as Record<string, unknown>).siswaId ?? "") };
  })
  .handler(async ({ data }): Promise<string[]> => {
    const s = await getSessionOr("penguji");
    if (s?.role !== "penguji") throw new Error("Hanya penguji.");
    const res = await gasPost("read", {
      table: "siswa",
      q: { id: data.siswaId },
    });
    const row = res.rows?.[0];
    if (!row) throw new Error("Siswa tidak ditemukan.");
    return ASPEK_ARAB_COLS.map((c) => String(row[c] ?? ""));
  });
