/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Remove crossorigin attributes from the built HTML — Capacitor's WKWebView
    // treats crossorigin="" module scripts as cross-origin, which masks real JS
    // errors as "Script error. Source: :0:0" instead of showing the actual error.
    {
      name: 'remove-crossorigin',
      apply: 'build',
      transformIndexHtml(html) {
        return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '');
      },
    },
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Dev server config – use a dedicated port so it doesn't collide
  // with other local tools (e.g. UI Testing dashboards)
  server: {
    port: 5174,
    strictPort: true,
    // Proxy /api/* to vercel dev (run: vercel dev --listen 3001 in a separate terminal)
    // Falls back gracefully: if vercel dev isn't running, the app uses the direct
    // browser Anthropic API fallback in LLMParserService.ts (requires VITE_ANTHROPIC_API_KEY).
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  test: {
    globals: true,
    environment: 'node',
  },
})
