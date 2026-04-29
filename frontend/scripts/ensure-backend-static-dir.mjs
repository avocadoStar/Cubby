import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const staticDir = resolve(import.meta.dirname, '../../backend/cmd/server/static')
const gitkeepPath = resolve(staticDir, '.gitkeep')

await mkdir(staticDir, { recursive: true })
await writeFile(gitkeepPath, '', 'utf8')
