// @ts-nocheck — dist/ hasil build tanpa deklarasi tipe; dijalankan bun, bukan tsc.
// ponytail: bootstrap produksi standalone — dist/server hanya mengekspor
// fetch (tanpa listener), jadi Bun.serve membungkusnya di sini.
import server from "./dist/server/server.js";

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "127.0.0.1";

Bun.serve({ port, hostname, fetch: server.fetch });
console.log(`[tmb] produksi: http://${hostname}:${port}`);
