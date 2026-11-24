import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { lib: { entry: 'src/main/index.ts' } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: 'src/preload/index.ts', formats: ['cjs'] },
      rollupOptions: { output: { entryFileNames: '[name].cjs' } },
    },
  },
  renderer: {
    plugins: [react()],
  },
})
