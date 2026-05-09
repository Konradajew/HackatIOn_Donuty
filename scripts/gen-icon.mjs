// One-shot script: generates TRICARD placeholder icons for Expo.
// Run once: node scripts/gen-icon.mjs
// Requires: npm i -D sharp  (dev-only dependency)

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const out   = path.join(__dir, '..', 'assets', 'images');

function mainSvg(size) {
  const fs = Math.round(size * 0.42);
  const dx = Math.round(size * 0.12);
  const dy = Math.round(size * 0.06);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#13121c"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="monospace" font-weight="900" font-size="${fs}"
    fill="#ff4898">T</text>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="monospace" font-weight="900" font-size="${fs}"
    fill="#00ebd7" transform="translate(${dx} ${dy})">C</text>
</svg>`;
}

function fgSvg(size) {
  const fs = Math.round(size * 0.42);
  const dx = Math.round(size * 0.12);
  const dy = Math.round(size * 0.06);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="monospace" font-weight="900" font-size="${fs}"
    fill="#ff4898">T</text>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="monospace" font-weight="900" font-size="${fs}"
    fill="#00ebd7" transform="translate(${dx} ${dy})">C</text>
</svg>`;
}

async function gen(svgStr, dest, size) {
  await sharp(Buffer.from(svgStr))
    .resize(size, size)
    .png()
    .toFile(dest);
  console.log(`✓ ${dest}`);
}

await gen(mainSvg(1024), path.join(out, 'icon.png'),              1024);
await gen(mainSvg(1024), path.join(out, 'splash-icon.png'),       1024);
await gen(mainSvg(96),   path.join(out, 'favicon.png'),           96);
await gen(fgSvg(1024),   path.join(out, 'android-icon-foreground.png'), 1024);

console.log('All icons generated.');
