import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks(id) {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Framer Motion
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            // Charts
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            // Firebase
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // UI libs
            if (id.includes('lucide') || id.includes('hot-toast')) {
              return 'vendor-ui';
            }
          }
        }
      }
    }
  }
});
