import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/database-visualizer/',
  plugins: [react()],
  server: {
    host: true, // Enables GitHub Codespaces and container port forwarding
    port: 3000,
    open: false,
  },
});
