import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getAuth } from "./auth-server";
import { isDatabaseConfigured } from "./db.server";
import { isMockMode } from "./mock";

export type Role = "siswa" | "penguji" | "panitia" | "admin";

export interface SessionData {
  role: Role;
  /** id siswa (siswa) atau kode (penguji/panitia/admin) */
  sub: string;
  cabangId?: string;
  nama?: string;
  exp: number;
}

const isRole = (role: string): role is Role =>
  role === "siswa" ||
  role === "penguji" ||
  role === "panitia" ||
  role === "admin";

// ponytail: satu-satunya sesi produksi adalah sesi Better Auth. Tanpa DB,
// tidak ada login (dashboard mock tetap bisa dijelajah via getSessionOr).
const getAuthSession = createServerOnlyFn(
  async (): Promise<SessionData | null> => {
    try {
      const result = await getAuth().api.getSession({
        headers: getRequestHeaders(),
      });
      if (!result) return null;
      const user = result.user as {
        role: string;
        subject: string;
        cabangId?: string | null;
        displayName?: string | null;
        name: string;
      };
      if (!isRole(user.role)) return null;
      return {
        role: user.role,
        sub: user.subject,
        cabangId: user.cabangId ?? undefined,
        nama: user.displayName ?? user.name,
        exp: Math.floor(result.session.expiresAt.getTime() / 1000),
      };
    } catch {
      return null;
    }
  },
);

export async function getSession(): Promise<SessionData | null> {
  return getAuthSession();
}

// ponytail: bypass login hanya saat tanpa DB — sesi pabrikan dengan kode
// seed yang valid (SCAN-01/P101). Dengan DB, selalu sesi Better Auth asli.
// Admin dikecualikan: wajib login form.
export function mockSession(role: Role): SessionData {
  const sub = role === "penguji" ? "P101" : "SCAN-01";
  return {
    role,
    sub,
    cabangId: "AW3",
    nama: role === "penguji" ? "Ahmad Hidayat" : "Panitia (dev)",
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
  };
}

/** Sesi Better Auth (DB atau memory). Mock = sesi pabrikan bila belum login. */
export async function getSessionOr(role: Role): Promise<SessionData | null> {
  const s = await getSession();
  if (s) return s;
  if (!isDatabaseConfigured() && role !== "admin" && isMockMode()) {
    return mockSession(role);
  }
  return null;
}
