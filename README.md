# Martal Sequence Viewer — `dev.martal.ir`

A clean, professional **PNG sequence viewer / animation preview tool** for game
artists and developers. Drag in a folder of exported sprite frames and preview
the animation instantly. Everything runs **100% in the browser** — no files are
ever uploaded.

Part of the Martal Games developer tools panel.

## Features

- **Drag & drop** a folder or multiple images (PNG, JPG, WebP, GIF, BMP, AVIF).
  Files are **naturally sorted** by name (`frame_2` before `frame_10`) and
  decoded up front so playback never stalls. Loading progress is shown.
- **Canvas viewer** with a transparency **checkerboard**, dark / light / custom
  backgrounds, **pixel-art (nearest-neighbour) or smooth** rendering, fit /
  100% / 200% zoom, zoom in/out, **scroll-wheel zoom toward the cursor**, and
  **drag to pan**.
- **Accurate playback** driven by `requestAnimationFrame` with an FPS
  accumulator (not `setInterval`). Play/pause, stop, step, FPS slider + number
  input, **reverse**, **loop**, and **ping-pong**.
- **Transforms:** flip horizontal / vertical, rotate 90° either way.
- **Bottom timeline** with lazy-loaded thumbnails; click to jump, active frame
  is highlighted and auto-scrolled into view.
- **Sequence info** (frame count, image size, FPS, duration, frame size),
  **copy info** to clipboard, and **export the current frame as PNG** with the
  flip/rotation baked in.
- **Keyboard shortcuts:** `Space` play/pause · `←`/`→` step · `R` reverse ·
  `F` fit · `H` flip-H · `V` flip-V.

## Tech

React + TypeScript + Vite, deployed on Cloudflare Workers (static assets). The
viewer is entirely client-side; the Worker only exposes `/api/health`.

```
src/react-app/
  App.tsx                 # root: all state + layout
  components/             # Viewer, ControlPanel, Timeline, TopBar, DropZone
  hooks/                  # usePlayback, useSequence, useKeyboardShortcuts
  utils/                  # naturalSort, loadFiles, format
  types.ts
src/worker/index.ts       # tiny health endpoint; SPA fallback handled by CF
```

## Development

```bash
npm install
npm run dev        # http://localhost:5173
```

Then drag a folder of PNG frames onto the page.

## Build & deploy

```bash
npm run build               # type-check + Vite build
npm run preview             # preview the production build locally
npm run deploy              # deploy to Cloudflare Workers (dev.martal.ir)
npm run lint                # ESLint
```

Set the `dev.martal.ir` custom domain / route for this Worker in the Cloudflare
dashboard (or via `wrangler.json` `routes`) when you're ready to publish.
