#!/usr/bin/env node
/**
 * @kodeking/lottie-to-gif
 *
 * Convert a Lottie JSON animation to an animated GIF.
 * Uses Puppeteer to render frames and gifski (or ffmpeg) for encoding.
 *
 * CLI:  npx lottie-to-gif input.json output.gif [--fps 15] [--width 480]
 * API:  const { convertToGif } = require('@kodeking/lottie-to-gif')
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const os            = require('os');
const { execFileSync, execSync } = require('child_process');
const { renderFrames } = require('./render');

/**
 * Convert a Lottie JSON file to animated GIF.
 *
 * @param {object} options
 * @param {string} options.input    Path to the Lottie JSON file
 * @param {string} options.output   Path for the output GIF
 * @param {number} [options.fps=15]     Frame rate (1–30)
 * @param {number} [options.width=480]  Output width in px
 * @param {number} [options.height]     Output height in px (default: same as width)
 * @param {number} [options.quality=90] gifski quality (1–100)
 */
async function convertToGif({ input, output, fps = 15, width = 480, height, quality = 90 } = {}) {
  if (!input)  throw new Error('input is required');
  if (!output) throw new Error('output is required');

  const h = height ?? width;
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lottie-gif-'));

  try {
    const manifest = await renderFrames({
      inputPath: input,
      outputDir: workDir,
      fps,
      width,
      height: h,
    });

    const frames = fs
      .readdirSync(path.join(workDir, 'frames'))
      .filter(f => f.endsWith('.png'))
      .sort()
      .map(f => path.join(workDir, 'frames', f));

    if (frames.length === 0) throw new Error('No frames were rendered.');

    // Try gifski first (higher quality), fall back to ffmpeg
    const gifski = findBin('gifski');
    if (gifski) {
      execFileSync(gifski, [
        '--quiet',
        '-o', output,
        '--fps', String(manifest.fps),
        '--quality', String(quality),
        ...frames,
      ], { stdio: 'pipe' });
    } else {
      const ffmpeg = requireBin('ffmpeg', 'Install ffmpeg: https://ffmpeg.org/download.html');
      const framePattern = path.join(workDir, 'frames', 'frame-%06d.png');
      const palette      = path.join(workDir, 'palette.png');

      execFileSync(ffmpeg, [
        '-y', '-framerate', String(manifest.fps), '-i', framePattern,
        '-vf', 'palettegen=max_colors=256:reserve_transparent=0',
        palette,
      ], { stdio: 'pipe' });

      execFileSync(ffmpeg, [
        '-y', '-framerate', String(manifest.fps), '-i', framePattern,
        '-i', palette,
        '-lavfi', 'paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
        '-loop', '0',
        output,
      ], { stdio: 'pipe' });
    }

    return { output, frames: manifest.totalFrames, fps: manifest.fps, width, height: h };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function findBin(name) {
  try { return execSync(`which ${name} 2>/dev/null`).toString().trim() || null; } catch { return null; }
}

function requireBin(name, hint) {
  const p = findBin(name);
  if (!p) throw new Error(`${name} not found. ${hint}`);
  return p;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      flags[args[i].slice(2)] = args[++i];
    } else {
      positional.push(args[i]);
    }
  }

  const [input, output = input?.replace(/\.json$/i, '.gif')] = positional;

  if (!input) {
    console.error('Usage: lottie-to-gif <input.json> [output.gif] [--fps 15] [--width 480] [--quality 90]');
    process.exit(1);
  }

  convertToGif({
    input,
    output,
    fps:     Number(flags.fps     ?? 15),
    width:   Number(flags.width   ?? 480),
    height:  flags.height ? Number(flags.height) : undefined,
    quality: Number(flags.quality ?? 90),
  })
    .then(result => {
      console.log(`✓ GIF saved to ${result.output} (${result.frames} frames at ${result.fps}fps)`);
    })
    .catch(e => {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    });
}

module.exports = { convertToGif };
