import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pages için gerekli
  define: {
    // API_KEY yoksa boş string ata ki build patlamasın
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
