import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'VibePlayer',
        short_name: 'VibePlayer',
        description: 'VibePlayer with Shazam integration',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        icons: []
      }
    })
  ],
  server: { port: 5173, proxy: { '/api': 'http://localhost:8000', '/ws': { target: 'ws://localhost:8000', ws: true }, '/static': 'http://localhost:8000' } }
})
