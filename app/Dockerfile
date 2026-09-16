# --- build: devDeps dibutuhkan `bun run build` (vite, TS, biome)
FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# --- runtime: hanya dependencies produksi
FROM oven/bun:1.3.14 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
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
