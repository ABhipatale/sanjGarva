// Generates every logo/icon asset from branding/logo-source.png.
// To change the logo: replace that file and run `npm run icons`.
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const path = (rel) => fileURLToPath(new URL(rel, import.meta.url))
const SOURCE = path('../branding/logo-source.png')
const DARK = '#0d0904' // matches the emblem's black background

const logo = (size) => sharp(SOURCE).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })

// On a solid background with padding (maskable icons and iOS, which do not support transparency).
async function onBackground(size, scale, file) {
  const inner = await logo(Math.round(size * scale)).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: DARK } })
    .composite([{ input: inner, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toFile(path(file))
}

// In-app logo (header, sidebar, login, settings) — small and sharp on retina screens.
await logo(320).webp({ quality: 88 }).toFile(path('../src/assets/logo.webp'))
// Splash screen + favicon.
await logo(256).png({ compressionLevel: 9, palette: true }).toFile(path('../public/logo-256.png'))
await logo(64).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(path('../public/favicon.png'))
// PWA icons.
await logo(192).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(path('../public/icons/icon-192.png'))
await logo(512).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(path('../public/icons/icon-512.png'))
await onBackground(512, 0.8, '../public/icons/icon-maskable-512.png')
await onBackground(180, 0.9, '../public/icons/apple-touch-icon.png')

console.log('Logo assets generated from branding/logo-source.png')
