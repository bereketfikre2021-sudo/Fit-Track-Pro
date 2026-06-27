import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const repoBase = process.env.GITHUB_PAGES ? '/Bk-Fitness-Track-Pro/' : '/'

export default defineConfig({
  base: repoBase,
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'FitTrack Pro - Workout Tracker',
        short_name: 'FitTrack Pro',
        description: 'Professional workout and meal planning tracker',
        theme_color: '#a3e635',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/heic2any')) return 'vendor-heic'
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) return 'vendor-charts'
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'vendor-i18n'
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix'
          if (
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/react-dom') ||
            (id.includes('node_modules/react/') && !id.includes('react-'))
          ) return 'vendor-react'
        },
      },
    },
  },
})
