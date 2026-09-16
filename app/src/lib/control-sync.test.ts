import { describe, expect, test } from "bun:test";
import { syncControlData } from "./control-sync";
import { dbAppend, dbRead } from "./db.server";
import { CONTROL_CABANG, CONTROL_SISWA } from "./seed-control.generated";

const base = {
  cabang_id: "AW99",
  jenjang: "SMP",
  kelas_tujuan: "7",
  jenis_kelamin: "LAKI-LAKI",
  program: "FULLDAY",
  peminatan: "AE",
  program_jurusan: "FULLDAY · AE",
};

describe("syncControlData", () => {
  test("update tanpa menghapus status/nilai lama", async () => {
    // ponytail: mock in-memory berbagi array seed; kembalikan panjangnya agar
    // test seed global tidak tercemar.
    const siswaLength = CONTROL_SISWA.length;
    const cabangLength = CONTROL_CABANG.length;
    try {
      await dbAppend("cabang", {
        id: "AW99",
        nama: "Cabang Uji",
        portal: "false",
        alamat: "",
        program: "",
        landing: "false",
      });
      await dbAppend("siswa", {
        id: "9901",
        kode: "AW99-B001",
        nama: "Anak Uji Sinkron",
        no_hp_wali: "08120009901",
        email: "lama@contoh.id",
        status_ujian: "selesai",
        nilai_calistung_math: "90",
        ...base,
      });

      await dbAppend("siswa", {
        id: "9902",
        kode: "AW99-B002",
        nama: "Anak Tetap Sinkron",
        no_hp_wali: "08120009909",
        email: "tetap@contoh.id",
        status_ujian: "belum",
        ...base,
      });

      const summary = await syncControlData({
        cabang: [],
        siswa: [
          {
            ...base,
            nama: "Anak Uji Sinkron",
            no_hp_wali: "08120009901",
            email: "baru@contoh.id",
          },
          {
            ...base,
            nama: "Anak Uji Sinkron",
            no_hp_wali: "08120009901",
            email: "baru@contoh.id",
          },
          {
            ...base,
            nama: "Anak Tetap Sinkron",
            no_hp_wali: "08120009909",
            email: "tetap@contoh.id",
          },
          {
            ...base,
            nama: "Anak Baru Sinkron",
            no_hp_wali: "08120009902",
            email: "",
          },
        ],
        issues: [],
      });

      expect(summary).toMatchObject({
        inserted: 1,
        updated: 1,
        unchanged: 1,
        skipped: 1,
      });
      const rows = await dbRead("siswa", { kode: "AW99-B001" });
      expect(rows[0]).toMatchObject({
        email: "baru@contoh.id",
        status_ujian: "selesai",
        nilai_calistung_math: "90",
      });
      const created = await dbRead("siswa", { kode: "AW99-B003" });
      expect(created).toHaveLength(1);
    } finally {
      CONTROL_SISWA.length = siswaLength;
      CONTROL_CABANG.length = cabangLength;
    }
  });
});
