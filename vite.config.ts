import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  optimizeDeps: {
    // Exclude canvaskit-wasm from pre-bundling — it manages its own WASM init
    exclude: ['canvaskit-wasm'],
  },
  server: {
    port: 3000,
    strictPort: false,
    fs: {
      // Allow dev server to serve .wasm from node_modules
      allow: ['.', path.resolve(__dirname, 'node_modules')],
    },
  },
  assetsInclude: ['**/*.wasm'],
})
