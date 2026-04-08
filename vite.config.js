import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/dice_stl_maker/',
  plugins: [react()],
  optimizeDeps: {
    include: ['three', 'opentype.js', '@jscad/modeling', '@jscad/stl-serializer'],
  },
  build: {
    target: 'esnext',
  },
  assetsInclude: ['**/*.ttf', '**/*.otf'],
})
