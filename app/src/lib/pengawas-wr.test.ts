import { describe, expect, test } from "bun:test";
import { isJenjangMath } from "./pengawas-wr";

describe("pengawas WR — batas jenjang Math", () => {
  test("hanya SMP & SMA (normalisasi spasi/kapital)", () => {
    expect(isJenjangMath("SMP")).toBe(true);
    expect(isJenjangMath("sma")).toBe(true);
    expect(isJenjangMath("  Smp ")).toBe(true);
    expect(isJenjangMath("SD")).toBe(false);
    expect(isJenjangMath("")).toBe(false);
    expect(isJenjangMath("SMK")).toBe(false);
  });
});
