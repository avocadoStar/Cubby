import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedConfigPath = path.resolve(__dirname, '../config.yaml')

function readConfigValue(key: string, fallback: string): string {
  try {
    const config = readFileSync(sharedConfigPath, 'utf8')
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = config.match(new RegExp(`^\\s*${escapedKey}\\s*:\\s*["']?([^"'\\s#]+)["']?\\s*(?:#.*)?$`, 'm'))
    return match?.[1] ?? fallback
  } catch {
    return fallback
  }
}

const backendPort = readConfigValue('backend_port', readConfigValue('port', '8080'))
const frontendPort = Number(readConfigValue('frontend_port', '5173'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: frontendPort,
    proxy: {
      '/api': `http://localhost:${backendPort}`,
    }
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
