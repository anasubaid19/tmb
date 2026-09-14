import { expect, test } from "bun:test";
import { autoCloseMs } from "./result-dialog";

test("autoCloseMs: sukses 3 dtk, duplikat 4 dtk, error 5 dtk", () => {
  expect(autoCloseMs({ nama: "A", kode: "AW4-A001" })).toBe(3000);
  expect(autoCloseMs({ nama: "A", kode: "AW4-A001", duplicate: true })).toBe(
    4000,
  );
  expect(autoCloseMs({ error: "Kode tidak dikenal." })).toBe(5000);
});
