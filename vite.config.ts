import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/, // Supabase API
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300, // Cache por 5 minutos
              },
            },
          },
          {
            urlPattern: /^https:\/\/docs\.google\.com\/.*$/, // Google Sheets API
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-sheets-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 600, // Cache por 10 minutos
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' || request.destination === 'script' || request.destination === 'style',
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 604800, // Cache por 7 días
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'StockFlow',
        short_name: 'StockFlow',
        description: 'Gestión de inventario en tiempo real',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/api/sheets': {
        target: 'https://docs.google.com',
        changeOrigin: true,
        rewrite: (path) => '/spreadsheets/d/1XNjSzzysQnolmmyf7pCb1E6PqeyJfUkqmAOGlePyDmw/values/Bolt!A:L?key=AIzaSyDC5O_2FjHqAFvFsNgZtlKVecVsDGQFFww',
        secure: true,
        timeout: 30000,
        followRedirects: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});