/**
 * Generates PWA icons (192 and 512) for FitTrack Pro.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" ry="80" fill="#a3e635"/>
  <g transform="translate(76, 76) scale(15)"
     fill="none"
     stroke="#0a0a0a"
     stroke-width="1.6"
     stroke-linecap="round"
     stroke-linejoin="round">
    <path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/>
    <path d="m2.5 21.5 1.4-1.4"/>
    <path d="m20.1 3.9 1.4-1.4"/>
    <path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/>
    <path d="m9.6 14.4 4.8-4.8"/>
  </g>
</svg>`

async function writeIcon(size, filename) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  writeFileSync(join(publicDir, filename), png)
  console.log(`Wrote ${filename} (${size}x${size})`)
}

mkdirSync(publicDir, { recursive: true })
await writeIcon(512, 'icon-512.png')
await writeIcon(192, 'icon-192.png')
console.log('Done.')
