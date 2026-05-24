import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Tectra-S1/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 31536000 } }
        }]
      },
      manifest: {
        name: 'TECTRA',
        short_name: 'TECTRA',
        description: 'Sistema operativo técnico-profesional',
        theme_color: '#141A21',
        background_color: '#141A21',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Tectra-S1/',
        scope: '/Tectra-S1/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
