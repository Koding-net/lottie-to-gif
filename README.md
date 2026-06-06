# @koding-net/lottie-to-gif

> Convert Lottie JSON animations to animated GIF — **Node.js CLI + programmatic API**

[![npm](https://img.shields.io/npm/v/@koding-net/lottie-to-gif)](https://www.npmjs.com/package/@koding-net/lottie-to-gif)
[![license](https://img.shields.io/npm/l/@koding-net/lottie-to-gif)](LICENSE)

Renders every frame of a Lottie animation using **Puppeteer + lottie-web**, then encodes to GIF using **gifski** (preferred) or **ffmpeg** (fallback). Try it live at [iconking.net/tools/lottie-to-gif](https://iconking.net/tools/lottie-to-gif).

---

## Prerequisites

| Tool | Required | Notes |
|---|---|---|
| Node.js ≥ 18 | ✅ | — |
| [gifski](https://gif.ski) | Recommended | Highest quality GIF encoding. Install via `brew install gifski` or [gif.ski](https://gif.ski) |
| [ffmpeg](https://ffmpeg.org) | Fallback | Used if gifski is not found. `brew install ffmpeg` or [ffmpeg.org](https://ffmpeg.org/download.html) |

Puppeteer (Chromium) is bundled as an npm dependency — no separate browser install needed.

---

## Install

```bash
npm install -g @koding-net/lottie-to-gif
# or use without installing:
npx @koding-net/lottie-to-gif input.json output.gif
```

---

## CLI usage

```bash
lottie-to-gif input.json output.gif [options]

Options:
  --fps      <number>   Frame rate (default: 15)
  --width    <number>   Output width in px (default: 480)
  --height   <number>   Output height in px (default: same as width)
  --quality  <number>   gifski quality 1–100 (default: 90)
```

### Examples

```bash
# Basic conversion (480×480 at 15fps)
lottie-to-gif animation.json animation.gif

# High quality 720p at 24fps
lottie-to-gif animation.json animation.gif --fps 24 --width 720

# Square 320×320 thumbnail at 12fps
lottie-to-gif animation.json thumbnail.gif --fps 12 --width 320

# Output filename defaults to input name when omitted
lottie-to-gif my-animation.json
# → my-animation.gif
```

---

## Programmatic API

```js
const { convertToGif } = require('@koding-net/lottie-to-gif');

const result = await convertToGif({
  input:   'animation.json',
  output:  'animation.gif',
  fps:     15,
  width:   480,
  quality: 90,
});

console.log(result);
// { output: 'animation.gif', frames: 45, fps: 15, width: 480, height: 480 }
```

### `convertToGif(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `input` | `string` | required | Path to the Lottie JSON file |
| `output` | `string` | required | Path for the output GIF |
| `fps` | `number` | `15` | Frame rate (1–30) |
| `width` | `number` | `480` | Output width in px |
| `height` | `number` | same as width | Output height in px |
| `quality` | `number` | `90` | gifski quality 1–100 |

Returns `Promise<{ output, frames, fps, width, height }>`.

---

## How it works

1. **Render** — Puppeteer launches a headless Chromium instance, loads the Lottie JSON with `lottie-web` canvas renderer, seeks to each frame, and saves PNG screenshots to a temp directory
2. **Encode** — If `gifski` is found, it encodes the PNGs to a high-quality GIF with dithering. Otherwise ffmpeg's 2-pass palette method is used as a fallback
3. **Cleanup** — The temp directory is deleted automatically

---

## GIF vs other formats

GIF uses a 256-color palette, which may cause banding on complex gradients. For better quality:
- **More colors / transparency** → use [@koding-net/lottie-to-webp](https://github.com/Koding-net/lottie-to-webp) (animated WebP)
- **Video (no size limit)** → use [@koding-net/lottie-to-mp4](https://github.com/Koding-net/lottie-to-mp4) or [@koding-net/lottie-to-webm](https://github.com/Koding-net/lottie-to-webm)

---

## License

MIT © [KodeKing](https://github.com/Koding-net)

---

## Related packages

| Package | Description |
|---|---|
| [@koding-net/lottie-to-mp4](https://github.com/Koding-net/lottie-to-mp4) | Render Lottie to MP4 video (Node.js) |
| [@koding-net/lottie-to-webm](https://github.com/Koding-net/lottie-to-webm) | Render Lottie to WebM with transparency (Node.js) |
| [@koding-net/lottie-to-webp](https://github.com/Koding-net/lottie-to-webp) | Render Lottie to animated WebP (Node.js) |
| [@koding-net/lottie-to-apng](https://github.com/Koding-net/lottie-to-apng) | Render Lottie to animated PNG (Node.js) |
| [@koding-net/lottie-to-svg](https://github.com/Koding-net/lottie-to-svg) | Extract SVG frames in the browser |

See all tools at [github.com/Koding-net/lottie-tools](https://github.com/Koding-net/lottie-tools).
