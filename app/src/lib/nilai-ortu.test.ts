import { describe, expect, test } from "bun:test";
import {
  ASPEK_ORTU,
  gradeOrtu,
  gradeOrtuLabel,
  parseOrtuAspek,
} from "./nilai-ortu";

describe("rubrik interview orang tua", () => {
  test("5 aspek", () => {
    expect(ASPEK_ORTU.map((a) => a.key)).toEqual([
      "ibadah",
      "akhlak",
      "polaasuh",
      "belajar",
      "gadget",
    ]);
  });

  test("batas grade kelulusan", () => {
    expect(gradeOrtu(0)).toBe("D");
    expect(gradeOrtu(9)).toBe("D");
    expect(gradeOrtu(10)).toBe("C");
    expect(gradeOrtu(15)).toBe("C");
    expect(gradeOrtu(16)).toBe("B");
    expect(gradeOrtu(21)).toBe("B");
    expect(gradeOrtu(22)).toBe("A");
    expect(gradeOrtu(25)).toBe("A");
    expect(gradeOrtuLabel("A")).toBe("Lulus Sangat Baik");
    expect(gradeOrtuLabel("B")).toBe("Lulus Standar");
    expect(gradeOrtuLabel("C")).toBe("Lulus Minimum");
    expect(gradeOrtuLabel("D")).toBe("Tidak Lulus");
  });

  test("parse 5 aspek valid", () => {
    expect(
      parseOrtuAspek({
        ibadah: "5",
        akhlak: "2",
        polaasuh: "1",
        belajar: "5",
        gadget: "5",
      }),
    ).toEqual([5, 2, 1, 5, 5]);
    expect(() =>
      parseOrtuAspek({
        ibadah: "5",
        akhlak: "0",
        polaasuh: "1",
        belajar: "5",
        gadget: "5",
      }),
    ).toThrow("1–5");
    expect(() =>
      parseOrtuAspek({
        ibadah: "5",
        akhlak: "x",
        polaasuh: "1",
        belajar: "5",
        gadget: "5",
      }),
    ).toThrow("1–5");
  });

  test("checksum contoh tahun lalu: 5+2+1+5+5=18 Lulus Standar", () => {
    const total = [5, 2, 1, 5, 5].reduce((a, b) => a + b, 0);
    expect(total).toBe(18);
    expect(gradeOrtu(total)).toBe("B");
    expect(gradeOrtuLabel(gradeOrtu(total))).toBe("Lulus Standar");
  });
});
