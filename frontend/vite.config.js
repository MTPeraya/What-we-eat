import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access from other machines
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Enable polling for Docker volume mounts
    },
  },
})
