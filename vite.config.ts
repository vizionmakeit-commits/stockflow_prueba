import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
