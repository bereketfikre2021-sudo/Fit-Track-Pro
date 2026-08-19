import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Custom domain (app.bereketfikre.et) serves from root — base is always '/'
const repoBase = '/'

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
        // Take control immediately — no waiting for old SW to die
        skipWaiting: true,
        clientsClaim: true,
        // Remove outdated caches from old SW versions
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp}'],
        // Exclude the FCM background SW — it self-registers via importScripts
        globIgnores: ['firebase-messaging-sw.js'],
        // Don't let the SW try to precache huge image chunks
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // SPA navigation fallback — every URL that isn't a file gets index.html
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        // Deny list: never serve SW-cached responses for auth/api calls
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        runtimeCaching: [
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts — actual font files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Background / public images served from the same origin
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fittrack-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // JS / CSS chunks (hashed filenames — safe to cache indefinitely)
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fittrack-assets',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          // Supabase REST API — NetworkFirst, fallback to cache when offline
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fittrack-supabase-api',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase Storage (images) — CacheFirst
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fittrack-supabase-storage',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase Auth endpoints — NetworkOnly (never cache tokens)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
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
