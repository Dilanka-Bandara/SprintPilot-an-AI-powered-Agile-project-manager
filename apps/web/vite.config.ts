import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  envDir: '../..',
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: true,
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000',
      '/health': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000',
    },
  },
});
