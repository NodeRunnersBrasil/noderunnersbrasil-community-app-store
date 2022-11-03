import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  preview: {
    host: "0.0.0.0",
    port: 5173
  },
  build: {
    sourcemap: false,
    commonjsOptions: {
      sourceMap: false,
    },
    minify: true,
  },
})