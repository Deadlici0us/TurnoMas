import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildLogoSvg } from "../lib/brand/logo-svg.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_BRAND = join(ROOT, "public", "brand");
const APP_DIR = join(ROOT, "app");

/**
 * Rasteriza un SVG y lo guarda como PNG.
 *
 * @param svg SVG de origen.
 * @param destination Ruta absoluta del PNG.
 */
async function writePng(svg, destination)
{
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(destination);
}

/**
 * Empaqueta PNGs en un ICO multi-size con compresión PNG.
 *
 * @param images Tamaños y buffers PNG.
 * @return Buffer con el archivo ICO.
 */
function buildIco(images)
{
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images)
  {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

await mkdir(PUBLIC_BRAND, { recursive: true });

const standard = buildLogoSvg({ size: 512 });
await writeFile(join(PUBLIC_BRAND, "logo.svg"), standard);
await writePng(standard, join(PUBLIC_BRAND, "logo-512.png"));
await writePng(standard, join(APP_DIR, "icon.png"));
await writePng(buildLogoSvg({ size: 180 }), join(APP_DIR, "apple-icon.png"));
await writePng(buildLogoSvg({ size: 192 }), join(PUBLIC_BRAND, "icon-192.png"));
await writePng(standard, join(PUBLIC_BRAND, "icon-512.png"));
await writePng(
  buildLogoSvg({ size: 512, paddingRatio: 0.2 }),
  join(PUBLIC_BRAND, "icon-maskable-512.png"),
);

const faviconImages = [];
for (const size of [16, 32, 48])
{
  const svg = buildLogoSvg({
    size,
    paddingRatio: size <= 32 ? 0.08 : 0.1,
    strokeWidth: size <= 16 ? 2.4 : size <= 32 ? 2.2 : 2,
    simplified: size <= 32,
  });
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  faviconImages.push({ size, png });
}
await writeFile(join(APP_DIR, "favicon.ico"), buildIco(faviconImages));

console.log("Brand assets generated in public/brand and app/");
