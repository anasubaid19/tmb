# --- build: devDeps dibutuhkan `bun run build` (vite, TS, biome)
FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
# ponytail: tree produksi dirakit di stage INI supaya cache unduhan bun
# (~/.bun/install/cache) sudah hangat dari instalasi di atas — instalasi
# kedua nyaris tak menyentuh jaringan. Sebelumnya stage runtime menginstal
# dari nol: setiap kali package.json/bun.lock berubah, ~200 MB diunduh dua
# kali (penyebab `docker compose build` lama sekali).
RUN mkdir -p /prod && cp package.json bun.lock /prod/ \
  && cd /prod && bun install --frozen-lockfile --production

# --- runtime: hanya dependencies produksi (disalin, bukan diinstal ulang)
FROM oven/bun:1.3.14 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/node_modules ./node_modules
# ponytail: package.json tetap perlu — memuat "type":"module" + map import "#/*".
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY prod.ts ./
# ponytail: migrasi jalan unbundled (bun transpile langsung) karena rantai
# import menyentuh modul virtual TanStack yang hanya vite yang bisa resolve.
COPY scripts ./scripts
COPY src ./src
RUN groupadd -r tmb && useradd -r -g tmb -d /app tmb \
  && mkdir -p server/uploads && chown -R tmb:tmb /app
USER tmb
EXPOSE 2626
# ponytail: migrasi idempoten — aman tiap start, tabel dibuat otomatis di
# container (tak perlu SSH manual). Gagal migrasi = container tak start.
CMD ["sh", "-c", "bun scripts/db-migrate.ts && bun prod.ts"]
