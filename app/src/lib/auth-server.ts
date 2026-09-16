import {
  type BetterAuthPlugin,
  betterAuth,
  type InternalAdapter,
} from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { z } from "zod";
import { resolveSiswaLogin } from "./auth-login";
import { dbRead, dbUpdate, getAuthDb, isDatabaseConfigured } from "./db.server";
import type { DbRow } from "./db-schema";
import type { Role } from "./session.server";

const SESSION_TTL_SECONDS = 12 * 3600;

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET (atau SESSION_SECRET) wajib min. 32 karakter",
    );
  }
  return secret;
}

function getBaseUrl(): string {
  const port = process.env.PORT ?? "2626";
  return process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`;
}
interface AuthProfile {
  subjectType: "siswa" | "staff";
  subject: string;
  role: Role;
  cabangId: string;
  displayName: string;
}

const authUserId = (profile: AuthProfile): string =>
  `${profile.subjectType}:${profile.subject}`;

/** Email sintetis internal; login email asli tetap di-resolve dari tabel siswa. */
const authEmail = (profile: AuthProfile): string =>
  `${profile.subjectType}-${profile.subject.toLowerCase()}@tmb.local`;

async function ensureAuthUser(adapter: InternalAdapter, profile: AuthProfile) {
  const id = authUserId(profile);
  const existing = await adapter.findUserById(id);
  const desired = {
    id,
    name: profile.displayName,
    email: authEmail(profile),
    emailVerified: false,
    role: profile.role,
    subjectType: profile.subjectType,
    subject: profile.subject,
    cabangId: profile.cabangId,
    displayName: profile.displayName,
  };
  if (!existing) {
    await adapter.createUser(desired, { method: "kode-login" });
  } else {
    const current = existing as unknown as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(desired)) {
      if (key !== "id" && current[key] !== value) updates[key] = value;
    }
    if (Object.keys(updates).length > 0) await adapter.updateUser(id, updates);
  }
  const user = await adapter.findUserById(id);
  if (!user) {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "Gagal menyiapkan akun login.",
    });
  }
  return user;
}

const toAnak = (row: DbRow) => ({
  id: String(row.id ?? ""),
  nama: String(row.nama ?? ""),
  cabangId: String(row.cabang_id ?? ""),
  jenjang: String(row.jenjang ?? ""),
  kelasTujuan: String(row.kelas_tujuan ?? ""),
});

const kodeLoginPlugin = {
  id: "kode-login",
  endpoints: {
    loginSiswa: createAuthEndpoint(
      "/kode-login/siswa",
      {
        method: "POST",
        body: z.object({
          mode: z.enum(["phone", "email"]),
          identifier: z.string().min(1),
          siswaId: z.string().optional(),
        }),
      },
      async (ctx) => {
        const rows = await dbRead("siswa");
        const matches = resolveSiswaLogin(
          rows,
          ctx.body.mode,
          ctx.body.identifier,
        );
        if (matches.length === 0) {
          throw new APIError("BAD_REQUEST", {
            message:
              ctx.body.mode === "email"
                ? "Email tidak terdaftar. Hubungi panitia."
                : "Nomor HP tidak terdaftar. Hubungi panitia.",
          });
        }
        if (matches.length > 1 && !ctx.body.siswaId) {
          return ctx.json({
            ok: true as const,
            picked: false as const,
            anak: matches
              .map(toAnak)
              .sort((a, b) => a.nama.localeCompare(b.nama, "id")),
          });
        }
        const row =
          matches.find(
            (candidate) => String(candidate.id ?? "") === ctx.body.siswaId,
          ) ?? matches[0];
        if (!row) {
          throw new APIError("BAD_REQUEST", {
            message: "Data anak tidak cocok dengan identitas ini.",
          });
        }
        const user = await ensureAuthUser(ctx.context.internalAdapter, {
          subjectType: "siswa",
          subject: String(row.id ?? ""),
          role: "siswa",
          cabangId: String(row.cabang_id ?? ""),
          displayName: String(row.nama ?? ""),
        });
        const session = await ctx.context.internalAdapter.createSession(
          String(user.id),
          false,
          {},
          false,
        );
        await setSessionCookie(ctx, { session, user }, false);
        return ctx.json({
          ok: true as const,
          picked: true as const,
          nama: String(row.nama ?? ""),
        });
      },
    ),
    loginStaff: createAuthEndpoint(
      "/kode-login/staff",
      {
        method: "POST",
        body: z.object({
          kode: z.string().min(1),
          password: z.string().optional(),
        }),
      },
      async (ctx) => {
        const kode = ctx.body.kode.toUpperCase();
        const rows = await dbRead("users", { kode });
        const staff = rows[0];
        const role = String(staff?.role ?? "");
        if (
          !staff ||
          (role !== "penguji" && role !== "panitia" && role !== "admin")
        ) {
          throw new APIError("BAD_REQUEST", { message: "Kode tidak valid." });
        }
        let cabangId = "";
        let nama = String(staff.nama ?? "");
        if (role === "penguji") {
          const penguji = (await dbRead("penguji", { kode }))[0];
          nama = String(penguji?.nama ?? nama);
          cabangId = String(penguji?.cabang_id ?? "");
        }
        const profile = {
          subjectType: "staff" as const,
          subject: kode,
          role: role as Role,
          cabangId,
          displayName: nama || kode,
        };
        let user: Awaited<ReturnType<typeof ensureAuthUser>> | null = null;
        if (role === "admin") {
          const password = ctx.body.password ?? "";
          if (!password) {
            throw new APIError("BAD_REQUEST", {
              message: "Password wajib diisi.",
            });
          }
          const userId = `staff:${kode}`;
          const accounts =
            await ctx.context.internalAdapter.findAccountByUserId(userId);
          const credential = accounts.find(
            (account) => account.providerId === "credential",
          );
          if (typeof credential?.password === "string" && credential.password) {
            const valid = await verifyPassword({
              hash: credential.password,
              password,
            });
            if (!valid)
              throw new APIError("BAD_REQUEST", { message: "Password salah." });
          } else if (String(staff.password ?? "") === password && password) {
            user = await ensureAuthUser(ctx.context.internalAdapter, profile);
            // ponytail: migrasi satu-kali dari password plaintext sheet lama ke
            // hash kredensial Better Auth, lalu kosongkan kolom plaintext.
            const hashed = await hashPassword(password);
            if (credential) {
              await ctx.context.internalAdapter.updateAccount(credential.id, {
                password: hashed,
              });
            } else {
              await ctx.context.internalAdapter.createAccount({
                userId,
                accountId: userId,
                providerId: "credential",
                password: hashed,
              });
            }
            await dbUpdate("users", kode, { password: "" });
          } else {
            throw new APIError("BAD_REQUEST", { message: "Password salah." });
          }
        }
        user ??= await ensureAuthUser(ctx.context.internalAdapter, profile);
        const session = await ctx.context.internalAdapter.createSession(
          String(user.id),
          false,
          {},
          false,
        );
        await setSessionCookie(ctx, { session, user }, false);
        return ctx.json({ ok: true as const, role, nama: nama || kode });
      },
    ),
  },
} satisfies BetterAuthPlugin;

// ponytail: tanpa DATABASE_URL, Better Auth tetap hidup memakai adapter
// in-memory agar login/eksplorasi mock jalan persis seperti produksi
// (sesi reset saat restart — sama seperti data mock sebelumnya).
let mockDb: Record<string, unknown[]> | null = null;

export function getAuth() {
  if (!isDatabaseConfigured() && !mockDb) {
    mockDb = { user: [], session: [], account: [], verification: [] };
  }
  return betterAuth({
    appName: "Tes Masuk Bersama",
    baseURL: getBaseUrl(),
    secret: getAuthSecret(),
    // ponytail: dev di vite (:5173) dan produksi (:2626/IP server) berbeda
    // origin; tanpa trustedOrigins, Better Auth menurunkan origin dari
    // baseURL saja → login kedua (yang sudah membawa cookie) ditolak
    // "Invalid origin". Terima semua origin: app single-origin, tanpa
    // callback eksternal, sehingga risiko CSRF antar-origin tak relevan.
    trustedOrigins: () => ["*"],
    database: isDatabaseConfigured()
      ? { db: getAuthDb(), type: "postgres" as const }
      : memoryAdapter(mockDb as Record<string, unknown[]>),
    plugins: [tanstackStartCookies(), kodeLoginPlugin],
    session: {
      expiresIn: SESSION_TTL_SECONDS,
      updateAge: SESSION_TTL_SECONDS,
    },
    user: {
      additionalFields: {
        role: { type: "string", required: true },
        subjectType: { type: "string", required: true },
        subject: { type: "string", required: true },
        cabangId: { type: "string", required: false },
        displayName: { type: "string", required: false },
      },
    },
  });
}

export type Auth = ReturnType<typeof getAuth>;
