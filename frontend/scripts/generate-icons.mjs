import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const sizes = [192, 512];

// SVG: 紫背景 + 白文字 "S"
function makeSvg(size) {
  const radius = size * 0.15;
  const fontSize = size * 0.55;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#7F77DD"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="central"
    text-anchor="middle"
    font-family="sans-serif"
    font-weight="bold"
    font-size="${fontSize}"
    fill="white"
  >S</text>
</svg>`.trim();
}

if (!existsSync('public')) {
  await mkdir('public', { recursive: true });
}

for (const size of sizes) {
  const svg = Buffer.from(makeSvg(size));
  await sharp(svg)
    .png()
    .toFile(`public/icon-${size}.png`);
  console.log(`Generated public/icon-${size}.png`);
}
