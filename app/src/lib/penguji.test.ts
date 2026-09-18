import { describe, expect, test } from "bun:test";
import { petaPengampuMateri } from "./penguji";

describe("petaPengampuMateri", () => {
  test("utamakan cabang yang cocok", () => {
    const peta = petaPengampuMateri(
      [
        { id: "P1", kode: "P-1", nama: "Satu", materi_id: "M1", cabang_id: "" },
        {
          id: "P2",
          kode: "P-2",
          nama: "Dua",
          materi_id: "M1",
          cabang_id: "AW4",
        },
      ],
      "AW4",
    );
    expect(peta.get("M1")).toEqual({ id: "P2", kode: "P-2", nama: "Dua" });
  });

  test("fallback lintas cabang bila tak ada yang cocok (data impor)", () => {
    const peta = petaPengampuMateri(
      [{ id: "P1", kode: "P-1", nama: "Satu", materi_id: "M1", cabang_id: "" }],
      "AW4",
    );
    expect(peta.get("M1")).toEqual({ id: "P1", kode: "P-1", nama: "Satu" });
  });

  test("baris tanpa materi diabaikan; baris pertama menang bila setara", () => {
    const peta = petaPengampuMateri(
      [
        { id: "P0", materi_id: "" },
        { id: "P1", kode: "P-1", nama: "Satu", materi_id: "M2" },
        { id: "P2", kode: "P-2", nama: "Dua", materi_id: "M2" },
      ],
      "AW4",
    );
    expect([...peta.keys()]).toEqual(["M2"]);
    expect(peta.get("M2")?.id).toBe("P1");
  });
});
