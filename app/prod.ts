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
    return (await staticFile(args[0])) ?? server.fetch(...args);
  },
});
console.log(`[tmb] produksi: http://${hostname}:${port}`);
