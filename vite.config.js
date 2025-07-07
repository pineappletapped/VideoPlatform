import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: 'wwwroot/graphics.html'
    },
    outDir: 'wwwroot/dist',
    emptyOutDir: true
  }
});
