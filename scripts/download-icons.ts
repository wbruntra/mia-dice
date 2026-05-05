import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const ICON_URL =
  'https://wbruntra.us-iad-1.linodeobjects.com/generated-images/generated_2026-05-05T11-37-53-126Z.jpg'
const OUT_DIR = resolve(import.meta.dir, '../frontend/public')

await mkdir(OUT_DIR, { recursive: true })

console.log('Downloading icon...')
const res = await fetch(ICON_URL)
if (!res.ok) throw new Error(`Failed to download: ${res.status}`)
const buf = Buffer.from(await res.arrayBuffer())

// favicon.ico (32x32 png wrapped, sharp can't do .ico so we do png)
await sharp(buf)
  .resize(32, 32, { fit: 'cover' })
  .png()
  .toFile(join(OUT_DIR, 'favicon.png'))

// favicon.svg — we keep the existing SVG icon but let's also create the PNG-based sizes
// apple-touch-icon (180x180)
await sharp(buf)
  .resize(180, 180, { fit: 'cover' })
  .png()
  .toFile(join(OUT_DIR, 'apple-touch-icon.png'))

// PWA icons
await sharp(buf)
  .resize(192, 192, { fit: 'cover' })
  .png()
  .toFile(join(OUT_DIR, 'icon-192.png'))

await sharp(buf)
  .resize(512, 512, { fit: 'cover' })
  .png()
  .toFile(join(OUT_DIR, 'icon-512.png'))

// Also create an SVG favicon that references the PNG
// For simplicity, we'll also create a favicon.ico-sized png
await sharp(buf)
  .resize(48, 48, { fit: 'cover' })
  .png()
  .toFile(join(OUT_DIR, 'favicon-48.png'))

console.log('Icons generated!')

// List file sizes
for (const name of ['favicon.png', 'favicon-48.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  const stats = await Bun.file(join(OUT_DIR, name)).stat()
  console.log(`  ${name}: ${(stats.size / 1024).toFixed(1)} KB`)
}
