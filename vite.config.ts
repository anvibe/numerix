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
      // In production, these routes are handled by Vercel serverless functions
      '/api': {
        target: process.env.VITE_VERCEL_URL || 'https://numerix-kappa.vercel.app',
        changeOrigin: true,
        secure: true,
        // Only proxy if we're in development and have a Vercel URL
        configure: (proxy, _options) => {
          // If no Vercel URL is set, the proxy won't work - user should use `vercel dev` instead
          if (!process.env.VITE_VERCEL_URL && !process.env.VERCEL_URL) {
            console.warn('⚠️  API proxy not configured. For local development with API routes, either:');
            console.warn('   1. Set VITE_VERCEL_URL in .env to your Vercel deployment URL');
            console.warn('   2. Or use `vercel dev` to run the full Vercel environment locally');
          }
        },
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
