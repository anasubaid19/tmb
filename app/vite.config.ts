import { defineConfig } from 'vite'

import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  server: {
    // ponytail: cloudflared tunnel pakai subdomain acak tiap run — izinkan
    // semua subdomain *.trycloudflare.com agar Host check Vite tak memblokir.
    allowedHosts: [".trycloudflare.com"],
  },
})

export default config
