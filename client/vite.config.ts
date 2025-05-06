import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [preact(), tailwindcss()],
  server: {
    port: 4173,
    host: true,
    origin: 'http://0.0.0.0:4173',
  },
});
