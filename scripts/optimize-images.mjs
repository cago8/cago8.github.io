/**
 * Converts the raw screenshots in public/assets to WebP.
 *
 * The site is a static export with Next's image optimizer disabled, so
 * whatever sits in public/ is exactly what visitors download. Run this after
 * dropping new screenshots in:
 *
 *     node scripts/optimize-images.mjs
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const TARGETS = ['public/assets/projects', 'public/assets'];
const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const MAX_WIDTH = 1600;
const QUALITY = 80;

for (const directory of TARGETS) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(extension)) continue;

    const source = path.join(directory, entry.name);
    const output = source.replace(/\.(png|jpe?g)$/i, '.webp');

    await sharp(source)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(output);

    const before = (await stat(source)).size;
    const after = (await stat(output)).size;
    await unlink(source);

    console.log(
      `${entry.name} → ${path.basename(output)}  ${(before / 1024).toFixed(0)}kB → ${(
        after / 1024
      ).toFixed(0)}kB`,
    );
  }
}
