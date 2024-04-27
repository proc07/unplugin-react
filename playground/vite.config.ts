import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import singleFileReact from 'unplugin-react/vite'

export default defineConfig({
  plugins: [
    singleFileReact(),
    react(),
  ] as UserConfig['plugins'],
})
