# Pixi → Skia Renderer

A TypeScript application that renders a **PIXI.js scene** using the **Skia (CanvasKit) graphics engine** and exports the result as a **vector PDF**.

## Live demo

Deploy to any static host (Vercel, Netlify, GitHub Pages) after running `npm run build`.

---

## Features

| Feature | Details |
|---------|---------|
| Skia wrapper | Walks `PIXI.Container` tree, mirrors all transforms (translate / rotate / scale / pivot) |
| Supported objects | `PIXI.Graphics` (fill, stroke, ellipse, rect, polygon, lines) · `PIXI.Sprite` (PNG) |
| PDF export | Vector PDF via `CanvasKit.MakePDFDocument()` — shapes are real PDF paths, not bitmaps |
| Scene switcher | 3 distinct pre-built scenes, switchable via tab buttons or Prev / Next |
| Pointer events | `pointerdown` / `pointerup` work on both the Pixi canvas **and** the Skia mirror canvas |
| Event log | Live overlay showing which object fired, with timestamp |

---

## Quick start

### Prerequisites

- **Node.js ≥ 18** (for `fetch` and modern ESM support)
- **npm ≥ 9**

### Install & run

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/pixi-skia-app.git
cd pixi-skia-app

# 2. Install dependencies  (~200 MB; canvaskit-wasm is large)
npm install

# 3. Start dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

> The first load fetches the CanvasKit `.wasm` file (~7 MB) from unpkg.com.
> Subsequent loads use the browser cache.

### Build for production

```bash
npm run build     # outputs to dist/
npm run preview   # preview the production build locally
```

---

## Project structure

```
pixi-skia-app/
├── index.html                  # Single-page app shell + CSS
├── vite.config.ts              # Vite config (WASM headers, optimizeDeps)
├── tsconfig.json
├── package.json
└── src/
    ├── main.ts                 # Bootstrap: Pixi app, Skia surface, render loop
    ├── pixi/
    │   └── scene.ts            # 3 demo PIXI.Container scenes
    ├── skia/
    │   ├── types.ts            # CanvasKit TypeScript type shims
    │   ├── canvasKitLoader.ts  # Async WASM loader
    │   ├── colorUtils.ts       # PIXI color → Skia float[4]
    │   ├── matrixUtils.ts      # PIXI transform → Skia 3×3 matrix
    │   ├── renderer.ts         # Core wrapper: convertPixiContainerToSkia()
    │   └── pdfExport.ts        # PDF export via Skia PDF backend
    ├── events/
    │   └── hitTest.ts          # Pointer event forwarding Skia→PIXI
    └── ui/
        ├── sceneTabs.ts        # Tab pills + Prev/Next scene switcher
        └── eventLog.ts         # Pointer event log overlay
```

---

## How the Skia wrapper works

```
convertPixiContainerToSkia(ck, skCanvas, container)
       │
       ▼
  renderNode(node)
       │
       ├── canvas.save()
       ├── canvas.concat( buildLocalMatrix(node) )   ← translate·rotate·scale·pivot
       │
       ├── if Graphics  → renderGraphics()
       │       └── iterate geometry.graphicsData[]
       │           ├── buildSkiaPath(shape)  ← rect / ellipse / circle / polygon
       │           ├── fill pass  (ck.PaintStyle.Fill)
       │           └── stroke pass (ck.PaintStyle.Stroke)
       │
       ├── if Sprite    → renderSprite()
       │       └── extract pixels via tmp <canvas>, upload as SkImage
       │
       └── if Container → recurse into children
               └── canvas.restore()
```

### Matrix construction

PIXI computes: `T(position) · R(angle) · S(scale) · T(-pivot)`

We replicate this as a single 3×3 affine matrix and pass it to `canvas.concat()`.

---

## PDF export

```typescript
const pdfDoc   = ck.MakePDFDocument()
const pdfCanvas = pdfDoc.beginPage(width, height)   // returns a SkCanvas
// draw everything — PDF records vector commands, NOT pixels
convertPixiContainerToSkia(ck, pdfCanvas, container)
pdfDoc.endPage()
const bytes = pdfDoc.close()                         // Uint8Array
// trigger browser download
```

The result is a true **vector PDF** — shapes can be scaled infinitely.

---

## Events

PIXI handles `pointerdown`/`pointerup` on its own canvas automatically.

For the Skia mirror canvas we attach native `pointerdown`/`pointerup` DOM
listeners, convert the mouse position to canvas-local coordinates, walk the
PIXI display tree manually (using `getBounds()` in world space), and call
`emit()` on the matching interactive object.

---

## Scenes

| Scene | Contents |
|-------|----------|
| Scene 1 | Red ellipse + blue rectangle (from task spec) + two coloured line segments in a sub-container |
| Scene 2 | Concentric rings + interactive star polygon + green dot + cross |
| Scene 3 | 3×4 grid of colour-coded rounded rectangles + large diamond |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `pixi.js` | 7.2.4-legacy | 2D renderer (Canvas 2D backend, `forceCanvas: true`) |
| `canvaskit-wasm` | 0.39.1 | Google's Skia compiled to WASM; provides `SkCanvas`, PDF backend |
| `vite` | ^5 | Dev server + bundler |
| `typescript` | ^5 | Type safety |

---

## Troubleshooting

**CanvasKit fails to load**
- Check network — it fetches `canvaskit.wasm` (~7 MB) from unpkg.com on first load.
- Some corporate proxies block `.wasm` files; serve the file locally if needed.

**PDF has no shapes**
- Open the browser console. If you see `graphicsData is empty`, the PIXI version
  may store geometry differently. The renderer targets PIXI 7.2.4-legacy.

**Pointer events not firing on Skia canvas**
- Ensure the PIXI objects have `eventMode = 'static'` (set in `scene.ts`).
- The hit-test uses `getBounds()` which requires the PIXI ticker to have run at
  least once so world transforms are up to date.
