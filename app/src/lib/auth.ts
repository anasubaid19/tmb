import { createServerFn } from "@tanstack/react-start";
import { gasPost } from "./gas.server";
import { normalizePhone } from "./phone";
import {
  clearSessionCookie,
  getSession,
  getSessionOr,
  type SessionData,
  setSessionCookie,
  signSession,
} from "./session.server";

function mustString(value: unknown, field: string): string {
  if (typeof value !== "object" || value === null)
    throw new Error("data tidak valid");
  const v = (value as Record<string, unknown>)[field];
  if (typeof v !== "string" || !v.trim())
    throw new Error(`${field} wajib diisi`);
  return v.trim();
}

export interface AnakOption {
  id: string;
  nama: string;
  cabangId: string;
  jenjang: string;
  kelasTujuan: string;
}

/**
 * Wali murid: lookup no. HP (tanpa password).
 * Satu HP bisa punya beberapa anak (sibling) → kembalikan daftar untuk dipilih.
 */
export const loginSiswaFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({ noHp: mustString(data, "noHp") }))
  .handler(
    async ({
      data,
    }): Promise<{
      ok: true;
      picked: boolean;
      nama?: string;
      anak?: AnakOption[];
    }> => {
      const noHp = normalizePhone(data.noHp);
      // ponytail: nomor tidak dicocokkan via q di GAS. Sheet menyimpan no_hp_wali
      // sebagai angka (0 depan dibuang Sheets) sehingga string-persis GAS tidak
      // pernah cocok dgn hasil normalizePhone yang selalu ber-0 depan. Baca
      // sekali lalu cocokkan kedua sisi dgn normalizePhone (format-agnostic).
      const res = await gasPost("read", { table: "siswa" });
      const rows = (res.rows ?? []).filter(
        (r) => normalizePhone(String(r.no_hp_wali ?? "")) === noHp,
      );
      if (rows.length === 0)
        throw new Error("Nomor tidak terdaftar. Hubungi panitia.");

      const toOption = (row: Record<string, unknown>): AnakOption => ({
        id: String(row.id ?? ""),
        nama: String(row.nama ?? ""),
        cabangId: String(row.cabang_id ?? ""),
        jenjang: String(row.jenjang ?? ""),
        kelasTujuan: String(row.kelas_tujuan ?? ""),
      });

      if (rows.length === 1) {
        const row = rows[0];
        const session = await signSession({
          role: "siswa",
          sub: String(row.id ?? ""),
          cabangId: String(row.cabang_id ?? ""),
          nama: String(row.nama ?? ""),
        });
        await setSessionCookie(session);
        return {
          ok: true as const,
          picked: true,
          nama: String(row.nama ?? ""),
        };
      }

      return {
        ok: true as const,
        picked: false,
        anak: rows
          .map(toOption)
          .sort((a, b) => a.nama.localeCompare(b.nama, "id")),
      };
    },
  );

/** Wali pilih anak setelah nomor cocok ke >1 siswa. */
export const pickSiswaFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({
    noHp: mustString(data, "noHp"),
    siswaId: mustString(data, "siswaId"),
  }))
  .handler(async ({ data }) => {
    const noHp = normalizePhone(data.noHp);
    // ponytail: cocokkan format-agnostic (lihat loginSiswaFn).
    const res = await gasPost("read", { table: "siswa" });
    const row = (res.rows ?? []).find(
      (r) =>
        normalizePhone(String(r.no_hp_wali ?? "")) === noHp &&
        String(r.id ?? "") === data.siswaId,
    );
    if (!row) throw new Error("Data anak tidak cocok dengan nomor ini.");
    const session = await signSession({
      role: "siswa",
      sub: String(row.id ?? ""),
      cabangId: String(row.cabang_id ?? ""),
      nama: String(row.nama ?? ""),
    });
    await setSessionCookie(session);
    return { ok: true as const, nama: String(row.nama ?? "") };
  });

/** Penguji & panitia scanner: login kode (tanpa password). */
export const loginStaffFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({ kode: mustString(data, "kode") }))
  .handler(async ({ data }) => {
    const kode = data.kode.toUpperCase();
    const res = await gasPost("read", { table: "users", q: { kode } });
    const user = res.rows?.[0];
    const role = String(user?.role ?? "");
    if (!user || (role !== "penguji" && role !== "panitia"))
      throw new Error("Kode tidak valid.");
    let nama = "";
    let cabangId = "";
    if (role === "penguji") {
      const p = await gasPost("read", { table: "penguji", q: { kode } });
      nama = String(p.rows?.[0]?.nama ?? "");
      cabangId = String(p.rows?.[0]?.cabang_id ?? "");
    }
    const session = await signSession({
      role: role as SessionData["role"],
      sub: kode,
      cabangId,
      nama,
    });
    await setSessionCookie(session);
    return { ok: true as const, role, nama };
  });

/** Admin: kode + password (plaintext di sheet users). */
export const loginAdminFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({
    kode: mustString(data, "kode"),
    password: mustString(data, "password"),
  }))
  .handler(async ({ data }) => {
    const kode = data.kode.toUpperCase();
    const res = await gasPost("read", { table: "users", q: { kode } });
    const user = res.rows?.[0];
    if (!user || String(user.role) !== "admin")
      throw new Error("Kode admin tidak valid.");
    if (String(user.password ?? "") !== data.password)
      throw new Error("Password salah.");
    const session = await signSession({
      role: "admin",
      sub: kode,
      nama: String(user.nama ?? kode),
    });
    await setSessionCookie(session);
    return { ok: true as const };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await clearSessionCookie();
  return { ok: true as const };
});

export const sessionFn = createServerFn().handler(
  async (): Promise<SessionData | null> => getSession(),
);

/** Sesi untuk guard route; di mock kembalikan sesi pabrikan per role. */
export const sessionFnOr = createServerFn()
  .validator((data: unknown) => {
    const role = mustString(data, "role");
    if (!["siswa", "penguji", "panitia", "admin"].includes(role))
      throw new Error("role tidak dikenal");
    return { role: role as SessionData["role"] };
  })
  .handler(
    async ({ data }): Promise<SessionData | null> => getSessionOr(data.role),
  );
