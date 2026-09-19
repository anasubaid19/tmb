# --- build: devDeps dibutuhkan `bun run build` (vite, TS, biome)
FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock ./
# ponytail: patch wajib ada sebelum `bun install` — patchedDependencies di
# package.json menunjuk file di patches/, dan bun menolak install bila file
# itu belum ada (COPY . . baru jalan setelah langkah ini).
COPY patches ./patches
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
# ponytail: tree produksi dirakit di stage INI supaya cache unduhan bun
# (~/.bun/install/cache) sudah hangat dari instalasi di atas — instalasi
# kedua nyaris tak menyentuh jaringan. Sebelumnya stage runtime menginstal
# dari nol: setiap kali package.json/bun.lock berubah, ~200 MB diunduh dua
# kali (penyebab `docker compose build` lama sekali).
RUN mkdir -p /prod && cp package.json bun.lock /prod/ \
  && cp -r patches /prod/patches \
  && cd /prod && bun install --frozen-lockfile --production

# --- runtime: hanya dependencies produksi (disalin, bukan diinstal ulang)
FROM oven/bun:1.3.14 AS runtime
WORKDIR /app
ENV NODE_ENV=production
# ponytail: user dibuat DULU agar semua COPY di bawah bisa --chown langsung —
# menggantikan `chown -R /app` yang re-run tiap src/ berubah (±30rb file
# node_modules ikut di-chown ulang = penyebab build 15–20 menit).
RUN groupadd -r tmb && useradd -r -g tmb -d /app tmb
COPY --chown=tmb:tmb --from=build /prod/node_modules ./node_modules
# ponytail: package.json tetap perlu — memuat "type":"module" + map import "#/*".
COPY --chown=tmb:tmb package.json ./
COPY --chown=tmb:tmb --from=build /app/dist ./dist
COPY --chown=tmb:tmb prod.ts ./
# ponytail: migrasi jalan unbundled (bun transpile langsung) karena rantai
# import menyentuh modul virtual TanStack yang hanya vite yang bisa resolve.
COPY --chown=tmb:tmb scripts ./scripts
COPY --chown=tmb:tmb src ./src
# ponytail: hanya uploads yang perlu chown eksplisit (writable saat runtime);
# sisanya sudah ber-owner tmb sejak COPY, jadi tak ada chown -R besar.
RUN mkdir -p server/uploads && chown tmb:tmb server/uploads
USER tmb
EXPOSE 2626
# ponytail: migrasi idempoten — aman tiap start, tabel dibuat otomatis di
# container (tak perlu SSH manual). Gagal migrasi = container tak start.
CMD ["sh", "-c", "bun scripts/db-migrate.ts && bun prod.ts"]
