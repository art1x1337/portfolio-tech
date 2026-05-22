/**
 * skia/pdfExport.ts
 *
 * Exports the current Skia canvas as a PDF.
 * Since MakePDFDocument() is only available in special Skia builds,
 * we render the scene onto an offscreen canvas and embed it as a
 * high-resolution image in a PDF via jsPDF.
 */

import * as PIXI from 'pixi.js-legacy'
import type { CanvasKit, SkSurface } from './types'
import { convertPixiContainerToSkia } from './renderer'

/**
 * Export the current scene as a PDF by rendering it to an offscreen
 * Skia surface and embedding the result in a PDF via jsPDF (loaded from CDN).
 */
export async function exportToPDF(
  ck: CanvasKit,
  container: PIXI.Container,
  width: number,
  height: number,
  filename = 'scene.pdf'
): Promise<void> {
  // 1. Render scene onto a fresh offscreen canvas via Skia
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height

  const surface: SkSurface | null = ck.MakeSWCanvasSurface(offscreen)
  if (!surface) {
    console.error('Could not create offscreen Skia surface for PDF export')
    return
  }

  const skCanvas = surface.getCanvas()
  skCanvas.clear(ck.Color4f(0.039, 0.039, 0.059, 1))
  convertPixiContainerToSkia(ck, skCanvas, container)
  surface.flush()
  surface.delete()

  // 2. Get image data as PNG base64
  const dataUrl = offscreen.toDataURL('image/png', 1.0)

  // 3. Load jsPDF from CDN if not already loaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(window as any).jspdf) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
  }

  // 4. Create PDF with the rendered image
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { jsPDF } = (window as any).jspdf
  const orientation = width >= height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling'],
  })

  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)
  pdf.save(filename)
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}
