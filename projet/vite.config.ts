import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Les ressources restent accessibles lorsque le site est publié dans /anni/.
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Aperçu Arena : le proxy sert l'app sur un host dynamique
    allowedHosts: true,
    // En local, Vite choisit le port automatiquement. Un proxy peut imposer
    // son port public avec CQ_HMR_CLIENT_PORT (par exemple 443).
    hmr: process.env.CQ_HMR_CLIENT_PORT
      ? { clientPort: Number(process.env.CQ_HMR_CLIENT_PORT) }
      : undefined,
  },
  build: { target: 'es2020', chunkSizeWarningLimit: 2000 },
});
