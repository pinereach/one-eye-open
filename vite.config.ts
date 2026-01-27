import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    // Only proxy API requests if not in styling-only mode
    // In styling mode, the API layer will use mock data
    proxy: process.env.VITE_STYLE_MODE !== 'true' ? {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false,
      },
    } : {},
  },
});
