import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const BG_URL =
  'https://wbruntra.us-iad-1.linodeobjects.com/generated-images/generated_2026-05-05T11-31-03-610Z.jpg'
const BG_WIDTH = 828
const OUT_DIR = resolve(import.meta.dir, '../frontend/public')

await mkdir(OUT_DIR, { recursive: true })

console.log('Downloading background...')
const res = await fetch(BG_URL)
if (!res.ok) throw new Error(`Failed to download: ${res.status}`)
const buf = Buffer.from(await res.arrayBuffer())

const outPath = join(OUT_DIR, 'pirate-bg.webp')

await sharp(buf)
  .resize(BG_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 75 })
  .toFile(outPath)

const stats = await Bun.file(outPath).stat()
console.log(`  → ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`)
console.log('Done!')
