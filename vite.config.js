import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: '/Kupati/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'הארנק שלי',
        short_name: 'הארנק שלי',
        description: 'קופת חיסכון וירטואלית לילדים',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/Kupati/',
        scope: '/Kupati/',
        lang: 'he',
        dir: 'rtl',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  build: {
    // Split heavy stable deps into their own chunks: app-code updates don't
    // force users to re-download firebase/react, and fetches parallelize.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/]@?firebase/.test(id)) return 'firebase'
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
        },
      },
    },
  },
})
