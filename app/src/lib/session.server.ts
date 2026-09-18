import { createServerOnlyFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
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

/** Bentuk user sesi Better Auth yang kita pakai. */
interface AuthUserLike {
  role?: string | null;
  subject?: string | null;
  cabangId?: string | null;
  displayName?: string | null;
  name?: string | null;
}

function toSessionData(
  user: AuthUserLike,
  expiresAt: Date | string | number | undefined,
): SessionData | null {
  const role = String(user.role ?? "");
  if (!isRole(role)) return null;
  const ms =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(expiresAt ?? 0).getTime();
  return {
    role,
    sub: String(user.subject ?? ""),
    cabangId: user.cabangId ?? undefined,
    nama: user.displayName ?? user.name ?? undefined,
    exp: Number.isNaN(ms) ? 0 : Math.floor(ms / 1000),
  };
}

const getAuthSession = createServerOnlyFn(
  async (): Promise<SessionData | null> => {
    try {
      const result = await getAuth().api.getSession({
        headers: getRequestHeaders(),
      });
      if (!result) return null;
      return toSessionData(
        result.user as AuthUserLike,
        result.session.expiresAt,
      );
    } catch (err) {
      // ponytail: dulu sunyi (null) — tendangan ke landing sulit didiagnosis.
      console.error("[auth] getSession gagal:", err);
      return null;
    }
  },
);

/**
 * Aktifkan sesi tersimpan (multi-session) yang role-nya cocok, lalu kembalikan
 * sesi itu. Semua tab satu browser berbagi satu cookie sesi aktif; tanpa ini,
 * login role lain di tab sebelah membuat tab ini "kehilangan" sesi dan
 * terlempar ke login saat refresh.
 */
const activateStoredSession = createServerOnlyFn(
  async (role: Role): Promise<SessionData | null> => {
    try {
      const auth = getAuth();
      const headers = getRequestHeaders();
      const devices = await auth.api.listDeviceSessions({ headers });
      const match = (devices ?? []).find(
        (d) => String((d.user as AuthUserLike).role ?? "") === role,
      );
      if (!match) return null;
      // ponytail: asResponse=true → Set-Cookie bisa diteruskan ke browser.
      const call = auth.api.setActiveSession as unknown as (input: {
        body: { sessionToken: string };
        headers: Headers;
        asResponse: true;
      }) => Promise<Response>;
      const res = await call({
        body: { sessionToken: match.session.token },
        headers,
        asResponse: true,
      });
      const cookies = res.headers.getSetCookie?.() ?? [];
      if (cookies.length > 0) setResponseHeader("set-cookie", cookies);
      const data = (await res.json()) as {
        session?: { expiresAt?: Date | string | number };
        user?: AuthUserLike;
      };
      if (!data?.user) return null;
      return toSessionData(data.user, data.session?.expiresAt);
    } catch (err) {
      console.error("[auth] activateStoredSession gagal:", err);
      return null;
    }
  },
);

export async function getSession(): Promise<SessionData | null> {
  return getAuthSession();
}

/**
 * Sesi untuk guard route + auto-switch: bila sesi aktif bukan `role` yang
 * diminta tapi ada sesi role tsb tersimpan (multi-session), aktifkan dulu.
 * Tanpa sesi sama sekali → null (pemanggil redirect ke login).
 */
export async function getSessionOr(role: Role): Promise<SessionData | null> {
  const current = await getAuthSession();
  if (current?.role === role) return current;
  const switched = await activateStoredSession(role);
  return switched ?? current;
}
