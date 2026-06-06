#!/usr/bin/env node
/**
 * render.js — Lottie frame renderer
 *
 * Renders a Lottie JSON animation frame-by-frame using Puppeteer + lottie-web.
 * Outputs PNG frames to a directory for downstream encoding.
 *
 * Usage: node render.js <input.json> <output-dir> [fps] [width] [height]
 *
 * Outputs:
 *   <output-dir>/frames/frame-000001.png, frame-000002.png, ...
 *   <output-dir>/manifest.json — { totalFrames, fps, width, height, ip, op }
 */

'use strict';

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

async function renderFrames({ inputPath, outputDir, fps, width, height }) {
  let lottieData;
  try {
    lottieData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse Lottie JSON: ${e.message}`);
  }

  const resolvedFps    = Math.min(60, Math.max(1,  parseInt(fps    ?? lottieData.fr ?? 24)));
  const resolvedWidth  = Math.min(2160, Math.max(32, parseInt(width  ?? lottieData.w  ?? 512)));
  const resolvedHeight = Math.min(2160, Math.max(32, parseInt(height ?? lottieData.h  ?? 512)));
  const ip             = lottieData.ip ?? 0;
  const op             = lottieData.op ?? 60;
  const sourceFps      = Math.max(1, lottieData.fr || 24);
  const step           = sourceFps / resolvedFps;

  const frameNumbers = [];
  for (let f = ip; f < op; f += step) {
    frameNumbers.push(Math.min(f, op - 1));
  }
  if (frameNumbers.length === 0) frameNumbers.push(ip);

  const framesDir = path.join(outputDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: resolvedWidth, height: resolvedHeight });

  // Inline lottie-web from the CDN (or a local copy if available)
  const lottieWebPath = require.resolve('lottie-web/build/player/lottie.min.js');
  const lottieWebSrc  = fs.readFileSync(lottieWebPath, 'utf8');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>*{margin:0;padding:0;background:transparent}html,body,#c{width:${resolvedWidth}px;height:${resolvedHeight}px;overflow:hidden}</style>
</head>
<body>
<div id="c"></div>
<script>${lottieWebSrc}</script>
<script>
const anim = lottie.loadAnimation({
  container: document.getElementById('c'),
  renderer: 'canvas',
  loop: false,
  autoplay: false,
  animationData: ${JSON.stringify(lottieData)},
  rendererSettings: { clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' },
});
window.__anim = anim;
window.__ready = false;
anim.addEventListener('DOMLoaded', () => { window.__ready = true; });
</script>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__ready === true, { timeout: 30_000 });

  for (let i = 0; i < frameNumbers.length; i++) {
    const frameNum = frameNumbers[i];
    await page.evaluate((f) => {
      window.__anim.goToAndStop(f, true);
    }, frameNum);

    // One rAF tick to let the canvas update
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

    const paddedIndex = String(i + 1).padStart(6, '0');
    const framePath   = path.join(framesDir, `frame-${paddedIndex}.png`);
    const clip        = { x: 0, y: 0, width: resolvedWidth, height: resolvedHeight };
    await page.screenshot({ path: framePath, clip, omitBackground: true });
  }

  await browser.close();

  const manifest = {
    totalFrames: frameNumbers.length,
    fps: resolvedFps,
    width: resolvedWidth,
    height: resolvedHeight,
    ip,
    op,
  };
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return manifest;
}

// ── CLI entry ────────────────────────────────────────────────────────────────

if (require.main === module) {
  const [,, inputPath, outputDir, fps, width, height] = process.argv;
  if (!inputPath || !outputDir) {
    console.error('Usage: node render.js <input.json> <output-dir> [fps] [width] [height]');
    process.exit(1);
  }
  renderFrames({ inputPath, outputDir, fps, width, height })
    .then(m => {
      console.log(JSON.stringify(m));
      process.exit(0);
    })
    .catch(e => {
      console.error(e.message);
      process.exit(1);
    });
}

module.exports = { renderFrames };
