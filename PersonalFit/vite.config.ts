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

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // ── Vendor chunks ──────────────────────────────────────────
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/analytics',
          ],
          'vendor-motion': ['framer-motion', 'motion'],
          'vendor-recharts': ['recharts'],
          'vendor-mui': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
          ],
          'vendor-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-separator',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
          ],
          'vendor-lucide': ['lucide-react'],
          'vendor-misc': [
            'date-fns',
            'idb',
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'cmdk',
            'sonner',
            'vaul',
            'react-hook-form',
            'react-day-picker',
            'embla-carousel-react',
            'react-slick',
            'react-resizable-panels',
            'react-responsive-masonry',
            'react-dnd',
            'react-dnd-html5-backend',
            'input-otp',
          ],
          'vendor-ai': [
            '@anthropic-ai/sdk',
            '@google/generative-ai',
          ],

          // ── Data chunks (large static data) ────────────────────────
          'data-translations': [
            './src/app/translations/index.ts',
          ],
          'data-products': [
            './src/app/data/productDatabase.ts',
            './src/app/data/mealData.ts',
          ],
          'data-ai-food': [
            './src/app/data/aiFoodKnowledge.ts',
          ],
          'data-recipes': [
            './src/app/data/recipeDatabase.ts',
            './src/app/data/mealAlternatives.ts',
            './src/app/data/seedFoods.ts',
          ],
        },
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
