import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_EDITION=cricsecrets builds the static Cric Secrets ops floor into ../hq/office (see website-docs).
const cric = process.env.VITE_EDITION === 'cricsecrets'

const cricShell = (): Plugin => ({
  name: 'cric-secrets-shell',
  transformIndexHtml(html) {
    if (!cric) return html
    return html
      .replace('<title>Agent Office</title>', '<title>Ops floor · Cric Secrets HQ · Hemi</title>')
      .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="The working floor of Cric Secrets: give the AI agents a job and watch it move desk to desk." />\n<meta name="theme-color" content="#12060F" />\n<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Cdefs%3E%3ClinearGradient id=%27g%27 x1=%270%27 x2=%271%27%3E%3Cstop offset=%270%27 stop-color=%27%23FF3D7F%27/%3E%3Cstop offset=%271%27 stop-color=%27%23FFC857%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%2732%27 height=%2732%27 rx=%278%27 fill=%27%2312060F%27/%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%279%27 fill=%27url(%23g)%27/%3E%3C/svg%3E\" />\n<meta property="og:title" content="Cric Secrets · Ops floor" />\n<meta property="og:image" content="https://hemanthkumargopi.vercel.app/og.png" />\n<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;700;800&family=JetBrains+Mono:wght@500&display=swap" />')
      .replace('<body>', '<body>\n<script src="../pixel-transition.js"></script>')
  },
})

export default defineConfig({
  base: './',
  plugins: [react(), cricShell()],
  server: { proxy: { '/api': 'http://127.0.0.1:5174' } },
  build: cric ? { outDir: '../hq/office', emptyOutDir: true } : {},
})
