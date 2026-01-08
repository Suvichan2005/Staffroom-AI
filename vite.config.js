import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  const azureEndpoint = env.VITE_AZURE_OPENAI_ENDPOINT || '';
  const azureTarget = azureEndpoint.endsWith('/') ? azureEndpoint.slice(0, -1) : azureEndpoint;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // Firebase Functions Proxy (needs emulator)
        '/api': {
          target: 'http://localhost:5001/staffroom-ai/us-central1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        // Direct Azure Proxy (Bypasses CORS and doesn't need Java/Emulator)
        '/azure-proxy': {
          target: azureTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/azure-proxy/, ''),
          secure: false,
          headers: {
            'Origin': 'https://staffroom.openai.azure.com'
          }
        }
      }
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
  };
});
