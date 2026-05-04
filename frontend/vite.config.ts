import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedConfigPath = path.resolve(__dirname, '../config.yaml')

function readBackendPort(): string {
  try {
    const config = readFileSync(sharedConfigPath, 'utf8')
    const match = config.match(/^\s*port\s*:\s*["']?(\d+)["']?\s*$/m)
    return match?.[1] ?? '8080'
  } catch {
    return '8080'
  }
}

const backendPort = readBackendPort()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': `http://localhost:${backendPort}` }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor'
          if (id.includes('node_modules/@dnd-kit')) return 'dnd'
        }
      }
    }
  }
})
