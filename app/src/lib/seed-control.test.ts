import { expect, test } from "bun:test";
import { isJenjangValid } from "./kode";
import { CONTROL_CABANG, CONTROL_SISWA } from "./seed-control.generated";

test("seed control: volume + kode unik + huruf valid + HP kanonis", () => {
  expect(CONTROL_SISWA.length).toBeGreaterThan(900);
  expect(CONTROL_CABANG.length).toBeGreaterThan(10);
  const kode = CONTROL_SISWA.map((s) => String(s.kode));
  expect(new Set(kode).size).toBe(kode.length);
  expect(kode.every((k) => /^AW\d+-[ABCK]\d{3,}$/.test(k))).toBe(true);
  expect(kode.some((k) => k.includes("-X"))).toBe(false);
  expect(CONTROL_SISWA.every((s) => isJenjangValid(String(s.jenjang)))).toBe(
    true,
  );
  expect(CONTROL_SISWA.every((s) => String(s.no_hp_wali).startsWith("0"))).toBe(
    true,
  );
  expect(CONTROL_SISWA.every((s) => String(s.status_ujian) === "belum")).toBe(
    true,
  );
});
