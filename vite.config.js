import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const METER_PATH = fileURLToPath(new URL('./src/dev/firestoreMeter.js', import.meta.url))

// Solo en `npm run dev` (apply: 'serve'): redirige los imports de
// 'firebase/firestore' hechos desde src/ al medidor de lecturas
// (src/dev/firestoreMeter.js). `vite build` nunca aplica este plugin.
// Se desactiva con VITE_FIRESTORE_METER=off en .env.local.
const firestoreMeter = () => ({
  name: 'firestore-meter',
  apply: 'serve',
  enforce: 'pre',
  resolveId(source, importer) {
    if (source !== 'firebase/firestore' || !importer) return null
    if (importer.includes('node_modules') || importer === METER_PATH) return null
    return METER_PATH
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const meterActivo = env.VITE_FIRESTORE_METER !== 'off' && !process.env.VITEST
  return {
    plugins: [react(), meterActivo && firestoreMeter()].filter(Boolean),
  }
})
