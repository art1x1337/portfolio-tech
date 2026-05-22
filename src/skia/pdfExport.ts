/**
 * skia/pdfExport.ts
 *
 * Exports the current PIXI scene as a vector PDF using the Skia PDF backend.
 *
 * Key points:
 *  - MakePDFDocument() opens a new PDF document in memory.
 *  - beginPage() returns a SkCanvas that accepts the same draw calls as the
 *    on-screen surface canvas — all geometry is stored as PDF vector commands.
 *  - endPage() / close() finalise the document and return raw bytes.
 *  - We trigger a browser download of the resulting .pdf file.
 */

import * as PIXI from 'pixi.js-legacy'
import type { CanvasKit } from './types'
import { convertPixiContainerToSkia } from './renderer'

/**
 * Export the given PIXI container as a vector PDF and trigger a browser
 * download.
 *
 * @param ck         Initialised CanvasKit instance
 * @param container  The PIXI.Container scene to export
 * @param width      Page width in points (= pixels at 72 dpi)
 * @param height     Page height in points
 * @param filename   Download filename (default: "scene.pdf")
 */
export function exportToPDF(
  ck: CanvasKit,
  container: PIXI.Container,
  width: number,
  height: number,
  filename = 'scene.pdf'
): void {
  // 1. Open a new PDF document in Skia's PDF backend
  const pdfDoc = ck.MakePDFDocument()

  // 2. Begin a page — returns a canvas backed by the PDF vector stream
  const pdfCanvas = pdfDoc.beginPage(width, height)

  // 3. Clear page to dark background (matches the on-screen look)
  pdfCanvas.clear(ck.Color4f(0.039, 0.039, 0.059, 1)) // #0a0a0f

  // 4. Re-render the entire PIXI scene onto the PDF canvas
  //    Every shape becomes a native PDF path/text/image command — not a bitmap.
  convertPixiContainerToSkia(ck, pdfCanvas, container)

  // 5. Finalise the page and close the document
  pdfDoc.endPage()
  const pdfBytes: Uint8Array = pdfDoc.close()

  // 6. Trigger browser download
  downloadBytes(pdfBytes, filename, 'application/pdf')
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Release object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
