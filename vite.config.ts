
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Electron loads files from the filesystem, so absolute paths (starting with /) fail.
  // We use './' to make paths relative to index.html.
  base: './',
  server: {
    proxy: {
      // 讓前端開發時的 /api 請求自動轉發到本地的 Node.js server (port 3000)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1000kb to reduce build noise
    outDir: 'dist',
    emptyOutDir: true,
  },
  define: {
    // Inject the build date as a string constant.
    // This ensures the "Release Date" in the About page is always the date of the last build.
    '__BUILD_DATE__': JSON.stringify(new Date().toISOString().split('T')[0]),
  }
})
