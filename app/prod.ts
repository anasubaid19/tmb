// @ts-nocheck — dist/ hasil build tanpa deklarasi tipe; dijalankan bun, bukan tsc.
// ponytail: bootstrap produksi standalone. dist/server HANYA mengekspor fetch
// (tanpa listener) dan tidak melayani file statis — jadi Bun.serve menyajikan
// dist/client lebih dulu, sisanya baru diteruskan ke SSR.
import { join, normalize, sep } from "node:path";
import server from "./dist/server/server.js";

const port = Number(process.env.PORT ?? 2626);
const hostname = process.env.HOST ?? "127.0.0.1";

/** Hasil build Vite: assets/ ber-hash + isi public/ (soal, sounds, svg). */
const clientDir = join(import.meta.dir, "dist/client");

/**
 * ponytail: satu-satunya choke point respons (statis + SSR) — selipkan
 * header keamanan di sini agar tak ada route yang lupa. Cloudflare
 * meneruskan header origin apa adanya, jadi ini tetap berlaku di prod.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  // ponytail: scanner QR butuh kamera → izinkan khusus self, sisanya tutup.
  "permissions-policy":
    "camera=(self), microphone=(), geolocation=(), payment=()",
  "cross-origin-opener-policy": "same-origin",
  // ponytail: 'unsafe-inline' untuk script+style WAJIB — tema anti-flicker dan
  // hydration TanStack memakai inline; eksternal hanya fonts.googleapis.
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; "),
};

function withSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/**
 * ponytail: defense-in-depth bila "Always Use HTTPS" Cloudflare belum ON —
 * http://tes-alwildan.id terbukti menyajikan konten 200 via http. Paksa 308
 * ke https di origin; localhost/dev tak tersentuh.
 */
function httpsRedirect(req: Request): Response | null {
  const url = new URL(req.url);
  const host = url.hostname.toLowerCase();
  const isProdHost =
    host === "tes-alwildan.id" || host.endsWith(".tes-alwildan.id");
  if (!isProdHost) return null;
  const cfVisitor = req.headers.get("cf-visitor");
  let proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (cfVisitor) {
    try {
      proto = (JSON.parse(cfVisitor) as { scheme?: string }).scheme ?? proto;
    } catch {
      // abaikan cf-visitor malformed, pakai x-forwarded-proto / url
    }
  }
  proto ??= url.protocol.replace(":", "");
  if (proto === "https") return null;
  url.protocol = "https:";
  return Response.redirect(url.toString(), 308);
}

/** Kembalikan file statis bila ada; null = biarkan SSR yang menangani. */
async function staticFile(req: Request): Promise<Response | null> {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(req.url).pathname);
  } catch {
    return null;
  }
  // ponytail: guard path traversal — path hasil resolve WAJIB tetap di dalam
  // clientDir. Tanpa ini `/assets/../../.env` bisa membocorkan .env.
  const resolved = normalize(join(clientDir, pathname));
  if (!resolved.startsWith(clientDir + sep)) return null;
  const file = Bun.file(resolved);
  if (!(await file.exists())) return null;
  // ponytail: asset ber-hash boleh immutable; file public/ cache pendek.
  return new Response(file, {
    headers: {
      "cache-control": pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    },
  });
}

Bun.serve({
  port,
  hostname,
  // ponytail: teruskan (...)args apa adanya agar konvensi Bun (req, server)
  // yang lama tidak berubah untuk handler SSR.
  async fetch(...args) {
    const req = args[0] as Request;
    const redirect = httpsRedirect(req);
    if (redirect) return withSecurityHeaders(redirect);
    const res =
      (await staticFile(req)) ?? (await server.fetch(...(args as [Request])));
    return withSecurityHeaders(res);
  },
});
console.log(`[tmb] produksi: http://${hostname}:${port}`);
