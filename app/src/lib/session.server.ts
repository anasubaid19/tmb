import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getAuth } from "./auth-server";

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

// ponytail: satu-satunya sesi adalah sesi Better Auth — selalu wajib login
// nyata, termasuk mode mock (login mock jalan via adapter in-memory).
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
    } catch (err) {
      // ponytail: dulu sunyi (null) — tendangan ke landing sulit didiagnosis.
      console.error("[auth] getSession gagal:", err);
      return null;
    }
  },
);

export async function getSession(): Promise<SessionData | null> {
  return getAuthSession();
}

/** Sesi Better Auth (DB atau memory) — tanpa sesi = belum login. */
export async function getSessionOr(_role: Role): Promise<SessionData | null> {
  return getSession();
}
