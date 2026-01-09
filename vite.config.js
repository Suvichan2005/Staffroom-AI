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
    define: {
      'process.env': {}
    },
    optimizeDeps: {
      include: ['recharts', 'framer-motion', 'lucide-react', 'react-hot-toast']
    },
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
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-motion': ['framer-motion']
          }
        }
      }
    }
  };
});
