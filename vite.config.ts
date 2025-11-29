import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Proxy API requests to Vercel deployment during local development
      // Use this when running `npm run dev` (Vite only, no serverless functions)
      // For full local development with API routes, use `npm run dev:vercel` instead
      '/api': {
        target: process.env.VITE_VERCEL_URL || 'https://numerix-kappa.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'openai-vendor': ['openai'],
          'export-vendor': ['jspdf', 'file-saver'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly to reduce warnings
  },
});
