/**
 * Icons for the extension and both stores.
 *
 * The SVGs are the source of truth; the PNGs are what the manifest and the stores read.
 * Rasterising needs macOS `sips` (same toolchain the repo already uses). Two shapes:
 *
 *   icon.svg         — rounded vermilion tile, for the manifest and the toolbar/card art.
 *   icon-mono.svg    — the same mark with a transparent background, for browser tabs.
 *                      Chromium strips the background of `action` icons and pins them to
 *                      the top-left, so tile art would cover the text-less strip; stores
 *                      also want a background-free 32px icon for the tab.
 *
 *   npm run icons
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = 'src/icons';
mkdirSync(dir, { recursive: true });

// Ink tile with paper curtains and a vermilion play mark — Framefold, the space in front of
// the screen. Geometric only, so the raster is identical everywhere.
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="16" y="16" width="480" height="480" rx="112" fill="#17181a"/>
  <rect x="96" y="120" width="44" height="272" rx="22" fill="#f5f4f1"/>
  <rect x="372" y="120" width="44" height="272" rx="22" fill="#f5f4f1"/>
  <path d="M204 160 L352 256 L204 352 Z" fill="#d0402f"/>
</svg>`;

// Same geometry with the tile removed; the curtains become accent ink so the mark reads
// on both light and dark tab strips.
const MONO = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="96" y="120" width="44" height="272" rx="22" fill="#d0402f"/>
  <rect x="372" y="120" width="44" height="272" rx="22" fill="#d0402f"/>
  <path d="M204 160 L352 256 L204 352 Z" fill="#d0402f"/>
</svg>`;

function rasterize(svgName, svg, sizes, suffix) {
  const tmpSvg = join(tmpdir(), `margin-${svgName}.svg`);
  const tmpPng = join(tmpdir(), `margin-${svgName}.png`);
  writeFileSync(join(dir, `${svgName}.svg`), svg);
  writeFileSync(tmpSvg, svg);
  // sips renders the SVG at its intrinsic 512px; resize from that master.
  execFileSync('sips', ['-s', 'format', 'png', tmpSvg, '--out', tmpPng], { stdio: 'ignore' });
  for (const size of sizes) {
    execFileSync('sips', ['-z', String(size), String(size), tmpPng, '--out', join(dir, `icon-${size}${suffix}.png`)], {
      stdio: 'ignore',
    });
  }
  rmSync(tmpSvg);
  rmSync(tmpPng);
}

// 16–128 for the manifest; 256/512 only for the store listing (packed into the zip, harmless).
rasterize('icon', TILE, [16, 32, 48, 128, 256, 512], '');
rasterize('icon-mono', MONO, [32], '-mono');

console.log('icons written');
