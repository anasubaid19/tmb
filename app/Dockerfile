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
RUN groupadd -r tmb && useradd -r -g tmb -d /app tmb \
  && mkdir -p server/uploads && chown -R tmb:tmb /app
USER tmb
EXPOSE 2626
CMD ["bun", "prod.ts"]
