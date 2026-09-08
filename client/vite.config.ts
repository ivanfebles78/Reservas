import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:3001'

// 5173 (el puerto por defecto de Vite) cae dentro de los rangos que Windows reserva para
// Hyper-V/WSL y falla con EACCES. Se puede cambiar con VITE_PORT.
const PORT = Number(process.env.VITE_PORT ?? 3000)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: PORT,
    host: '127.0.0.1',
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
