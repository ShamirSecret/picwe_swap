import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'docs',
  },
  server: {
    proxy: {
      '/v1': {
        target: 'https://aptos.testnet.porto.movementlabs.xyz',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
