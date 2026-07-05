import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' works both on GitHub Pages project path and the custom domain
export default defineConfig({
  base: './',
  plugins: [vue()],
})
