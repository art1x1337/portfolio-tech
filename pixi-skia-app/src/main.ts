/**
 * main.ts
 *
 * Application entry point.
 *
 * Responsibilities:
 *  1. Bootstrap a PIXI.Application (forceCanvas=true as required).
 *  2. Load CanvasKit WASM and create a Skia OffscreenCanvas surface.
 *  3. Build the 3 demo scenes.
 *  4. Set up scene-switcher UI.
 *  5. Run a render loop that mirrors the current PIXI scene to the Skia canvas.
 *  6. Wire up the PDF export button.
 *  7. Attach pointer events on the Skia canvas.
 */

import * as PIXI from 'pixi.js-legacy'
import { loadCanvasKit } from './skia/canvasKitLoader'
import { convertPixiContainerToSkia } from './skia/renderer'
import { exportToPDF } from './skia/pdfExport'
import { attachSkiaPointerEvents } from './events/hitTest'
import { initSceneTabs } from './ui/sceneTabs'
import { initEventLog } from './ui/eventLog'
import { buildScene1, buildScene2, buildScene3 } from './pixi/scene'
import type { CanvasKit } from './skia/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 600
const CANVAS_H = 400

// ─── Loading overlay helpers ──────────────────────────────────────────────────

function setLoadProgress(pct: number, msg: string): void {
  const bar = document.getElementById('loader-bar')
  const sub = document.getElementById('loader-sub')
  if (bar) bar.style.width = `${pct}%`
  if (sub) sub.textContent = msg
}

function hideLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay')
  overlay?.classList.add('hidden')
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── 1. Status dots ────────────────────────────────────────────────────────
  const skiaStatusDot  = document.getElementById('skia-status-dot')!
  const skiaStatusText = document.getElementById('skia-status-text')!

  // ── 2. PIXI Application ────────────────────────────────────────────────────
  setLoadProgress(5, 'Starting PixiJS…')

  const pixiWrap = document.getElementById('pixi-canvas-wrap')!

  const app = new PIXI.Application({
    width: CANVAS_W,
    height: CANVAS_H,
    forceCanvas: true,          // ← required by the task specification
    backgroundColor: 0x0a0a0f,
    antialias: true,
    resolution: 1,
  })

  // Size the canvas to fill its container
  const pixiCanvas = app.view as HTMLCanvasElement
  pixiCanvas.style.width  = '100%'
  pixiCanvas.style.height = '100%'
  pixiWrap.appendChild(pixiCanvas)

  // ── 3. Build scenes ────────────────────────────────────────────────────────
  setLoadProgress(15, 'Building scenes…')

  const scenes: PIXI.Container[] = [
    buildScene1(),
    buildScene2(),
    buildScene3(),
  ]

  let activeScene = scenes[0]
  app.stage.addChild(activeScene)

  // ── 4. CanvasKit WASM ──────────────────────────────────────────────────────
  let ck: CanvasKit

  try {
    ck = await loadCanvasKit((pct, msg) => {
      setLoadProgress(15 + pct * 0.7, msg)
    })
  } catch (err) {
    skiaStatusText.textContent = 'CanvasKit failed to load'
    skiaStatusDot.style.background = '#ef4444'
    console.error('CanvasKit load error:', err)
    setLoadProgress(100, 'Error loading CanvasKit — check console')
    return
  }

  // ── 5. Skia canvas surface ─────────────────────────────────────────────────
  setLoadProgress(90, 'Creating Skia surface…')

  const skiaWrap = document.getElementById('skia-canvas-wrap')!
  const skiaCanvas = document.createElement('canvas')
  skiaCanvas.width  = CANVAS_W
  skiaCanvas.height = CANVAS_H
  skiaCanvas.style.width  = '100%'
  skiaCanvas.style.height = '100%'
  skiaWrap.appendChild(skiaCanvas)

  // CanvasKit surface wrapping our <canvas>
  const surface = ck.MakeSWCanvasSurface(skiaCanvas)
  if (!surface) {
    console.error('Could not create Skia surface')
    skiaStatusText.textContent = 'Skia surface failed'
    skiaStatusDot.style.background = '#ef4444'
    return
  }

  // ── 6. Pointer events on Skia canvas ──────────────────────────────────────
  // Returns a cleanup callback (not needed in this demo but good practice)
  attachSkiaPointerEvents(skiaCanvas, activeScene)

  // We'll store the latest cleanup fn so we can re-attach when scene changes
  let cleanupSkiaEvents: (() => void) | null = null

  // ── 7. Scene switcher UI ───────────────────────────────────────────────────
  initSceneTabs({
    count: scenes.length,
    names: ['Scene 1', 'Scene 2', 'Scene 3'],
    onSwitch(index) {
      // Remove old scene from stage
      app.stage.removeChild(activeScene)
      activeScene = scenes[index]
      app.stage.addChild(activeScene)

      // Re-wire Skia pointer events
      cleanupSkiaEvents?.()
      cleanupSkiaEvents = attachSkiaPointerEvents(skiaCanvas, activeScene)

      // Force immediate Skia re-render
      renderSkia()
    },
  })

  // ── 8. PDF export button ──────────────────────────────────────────────────
  const btnExport = document.getElementById('btn-export') as HTMLButtonElement
  btnExport.addEventListener('click', () => {
    btnExport.disabled = true
    btnExport.textContent = '⏳ Exporting…'
    try {
      exportToPDF(ck, activeScene, CANVAS_W, CANVAS_H, `scene-${Date.now()}.pdf`)
    } finally {
      setTimeout(() => {
        btnExport.disabled = false
        btnExport.textContent = '⬇ Export PDF'
      }, 800)
    }
  })

  // ── 9. Event log overlay ──────────────────────────────────────────────────
  initEventLog()

  // ── 10. Render loop ────────────────────────────────────────────────────────
  // PIXI renders on its own ticker.
  // We sync the Skia mirror on every PIXI tick so they stay in lockstep.

  function renderSkia(): void {
    if (!surface) return
    const skCanvas = surface.getCanvas()
    skCanvas.clear(ck.Color4f(0.039, 0.039, 0.059, 1)) // #0a0a0f
    convertPixiContainerToSkia(ck, skCanvas, activeScene)
    surface.flush()
  }

  // FPS counter
  let frameCount = 0
  let lastFpsTime = performance.now()
  const fpsEl = document.getElementById('fps-counter')!

  app.ticker.add(() => {
    renderSkia()

    frameCount++
    const now = performance.now()
    if (now - lastFpsTime >= 1000) {
      fpsEl.textContent = `${Math.round(frameCount * 1000 / (now - lastFpsTime))} fps`
      frameCount = 0
      lastFpsTime = now
    }
  })

  // ── 11. Finalise UI ────────────────────────────────────────────────────────
  setLoadProgress(100, 'Ready!')
  skiaStatusDot.classList.remove('loading')
  skiaStatusDot.style.background = '#10b981'
  skiaStatusText.textContent = 'CanvasKit ready'

  setTimeout(hideLoadingOverlay, 300)
}

main().catch(console.error)
