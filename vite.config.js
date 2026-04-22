import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = {
  target: 'http://localhost:5001',
  changeOrigin: true,
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/chat': apiProxy,
      '/predict': apiProxy,
      '/login': apiProxy,
      '/signup': apiProxy,
      '/save_scan': apiProxy,
      '/get_scans': apiProxy,
      '/update_profile': apiProxy,
    }
  },
  preview: {
    proxy: {
      '/chat': apiProxy,
      '/predict': apiProxy,
      '/login': apiProxy,
      '/signup': apiProxy,
      '/save_scan': apiProxy,
      '/get_scans': apiProxy,
      '/update_profile': apiProxy,
    }
  }
})
