import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],

  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },

  build: {
    outDir: 'dist/extension',
    emptyOutDir: false,
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    lib: {
      entry: 'src/extension-entry.tsx',
      formats: ['iife'],
      name: 'SiteAwareStudio',
      fileName: () => 'sidepanel-bundle.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
