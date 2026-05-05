import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const IMAGES = {
  cardback:
    'https://wbruntra.us-iad-1.linodeobjects.com/generated-images/generated_2026-05-05T07-58-19-452Z.jpg',
}

const CARD_SIZE = 400
const OUT_DIR = resolve(import.meta.dir, '../frontend/public/cards')

async function downloadAndCompress(name, url) {
  console.log(`Downloading ${name}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${name}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())

  const outPath = join(OUT_DIR, `${name}.webp`)

  await sharp(buf)
    .resize(CARD_SIZE, CARD_SIZE, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(outPath)

  const stats = await Bun.file(outPath).stat()
  console.log(`  → ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`)
}

await mkdir(OUT_DIR, { recursive: true })

for (const [name, url] of Object.entries(IMAGES)) {
  await downloadAndCompress(name, url)
}

console.log('\nDone! Images saved to frontend/public/cards/')
