import { describe, expect, test } from "bun:test";
import { resolveSiswaLogin } from "./auth-login";
import type { DbRow } from "./db-schema";

const rows: DbRow[] = [
  { id: "1", kode: "AW3-A001", no_hp_wali: "628123", email: "Anak@Contoh.id" },
  { id: "2", kode: "AW3-A002", no_hp_wali: "08123", email: "" },
];

describe("resolveSiswaLogin", () => {
  test("nomor HP dinormalisasi (dua anak satu nomor)", () => {
    expect(resolveSiswaLogin(rows, "phone", "08123").map((r) => r.id)).toEqual([
      "1",
      "2",
    ]);
  });

  test("email case-insensitive", () => {
    expect(
      resolveSiswaLogin(rows, "email", "anak@contoh.id").map((r) => r.id),
    ).toEqual(["1"]);
  });

  test("kode tidak lagi dipakai sebagai identitas login", () => {
    expect(resolveSiswaLogin(rows, "phone", "AW3-A001")).toEqual([]);
    expect(resolveSiswaLogin(rows, "email", "AW3-A001")).toEqual([]);
    expect(resolveSiswaLogin(rows, "phone", "tidak-ada")).toEqual([]);
  });
});
