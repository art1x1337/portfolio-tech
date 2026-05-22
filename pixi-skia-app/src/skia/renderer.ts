/**
 * skia/renderer.ts
 *
 * Core wrapper: convertPixiContainerToSkia()
 *
 * Walks a PIXI.Container tree recursively and issues the equivalent Skia
 * draw calls on the provided SkCanvas.  Each node's local transform is pushed
 * onto the Skia canvas stack (save/concat/restore) so that nested containers
 * accumulate correctly.
 *
 * Supported PIXI objects
 * ──────────────────────
 *  • PIXI.Container  – recurse into children
 *  • PIXI.Graphics   – filled shapes and stroked lines
 *  • PIXI.Sprite     – PNG / bitmap images
 */

import * as PIXI from 'pixi.js-legacy'
import type { CanvasKit, SkCanvas, SkPath } from './types'
import { buildLocalMatrix } from './matrixUtils'
import { toSkiaColor } from './colorUtils'

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Draw the entire PIXI container tree onto a Skia canvas.
 *
 * @param ck        Initialised CanvasKit instance
 * @param skCanvas  Target Skia canvas (surface canvas or PDF page canvas)
 * @param container Root PIXI container to render
 */
export function convertPixiContainerToSkia(
  ck: CanvasKit,
  skCanvas: SkCanvas,
  container: PIXI.Container
): void {
  renderNode(ck, skCanvas, container)
}

// ─── Internal traversal ──────────────────────────────────────────────────────

function renderNode(
  ck: CanvasKit,
  canvas: SkCanvas,
  node: PIXI.DisplayObject
): void {
  if (!node.visible) return

  // Push local transform
  canvas.save()
  const localMatrix = buildLocalMatrix(ck, node)
  canvas.concat(localMatrix)

  if (node instanceof PIXI.Graphics) {
    renderGraphics(ck, canvas, node)
  } else if (node instanceof PIXI.Sprite) {
    renderSprite(ck, canvas, node)
  } else if (node instanceof PIXI.Container) {
    // Recurse into children
    for (const child of node.children) {
      renderNode(ck, canvas, child as PIXI.DisplayObject)
    }
  }

  canvas.restore()
}

// ─── Graphics renderer ───────────────────────────────────────────────────────

/**
 * Translates the recorded draw calls stored in a PIXI.Graphics object into
 * Skia path operations.
 *
 * PIXI.Graphics stores its draw history in `geometry.graphicsData` (v7).
 * Each entry has:
 *   - shape  : the geometric primitive
 *   - fillStyle  : { color, alpha, visible }
 *   - lineStyle  : { color, alpha, width, visible }
 */
function renderGraphics(
  ck: CanvasKit,
  canvas: SkCanvas,
  g: PIXI.Graphics
): void {
  // Access internal geometry data (PIXI v7 internal API)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphicsData: any[] = (g.geometry as any).graphicsData ?? []

  for (const entry of graphicsData) {
    const shape = entry.shape
    const fill: { color: number; alpha: number; visible: boolean } =
      entry.fillStyle
    const line: {
      color: number
      alpha: number
      width: number
      visible: boolean
    } = entry.lineStyle

    const path = new ck.Path()

    buildSkiaPath(path, shape)

    // Fill pass
    if (fill?.visible) {
      const paint = new ck.Paint()
      paint.setStyle(ck.PaintStyle.Fill)
      paint.setAntiAlias(true)
      const [r, gb, b, a] = toSkiaColor(fill.color, fill.alpha ?? 1)
      paint.setColor(ck.Color4f(r, gb, b, a))
      canvas.drawPath(path, paint)
      paint.delete()
    }

    // Stroke pass
    if (line?.visible && line.width > 0) {
      const paint = new ck.Paint()
      paint.setStyle(ck.PaintStyle.Stroke)
      paint.setAntiAlias(true)
      paint.setStrokeWidth(line.width)
      const [r, gb, b, a] = toSkiaColor(line.color, line.alpha ?? 1)
      paint.setColor(ck.Color4f(r, gb, b, a))
      canvas.drawPath(path, paint)
      paint.delete()
    }

    path.delete()
  }

  // Also handle any un-closed line paths stored in the points array (moveTo/lineTo)
  renderGraphicsPoints(ck, canvas, g)
}

/**
 * Convert a PIXI shape object (Circle, Ellipse, Rectangle, Polygon, etc.)
 * into a Skia path.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSkiaPath(path: SkPath, shape: any): void {
  if (!shape) return

  const type: string = shape.type ?? shape.constructor?.name ?? ''

  if (type === 'Rectangle' || shape.x !== undefined && shape.width !== undefined && shape.height !== undefined && shape.type !== 'Ellipse') {
    // PIXI.Rectangle
    path.addRect(
      new Float32Array([shape.x, shape.y, shape.x + shape.width, shape.y + shape.height])
    )
  } else if (
    type === 'Ellipse' ||
    (shape.radiusX !== undefined && shape.radiusY !== undefined)
  ) {
    // PIXI.Ellipse
    path.addOval(
      new Float32Array([
        shape.x - shape.radiusX,
        shape.y - shape.radiusY,
        shape.x + shape.radiusX,
        shape.y + shape.radiusY,
      ])
    )
  } else if (type === 'Circle' || shape.radius !== undefined) {
    // PIXI.Circle
    path.addOval(
      new Float32Array([
        shape.x - shape.radius,
        shape.y - shape.radius,
        shape.x + shape.radius,
        shape.y + shape.radius,
      ])
    )
  } else if (shape.points !== undefined) {
    // PIXI.Polygon
    const pts: number[] = shape.points
    if (pts.length >= 2) {
      path.moveTo(pts[0], pts[1])
      for (let i = 2; i < pts.length; i += 2) {
        path.lineTo(pts[i], pts[i + 1])
      }
      if (shape.closeStroke !== false) path.close()
    }
  }
}

/**
 * Some PIXI.Graphics calls (moveTo/lineTo) write into a separate points
 * buffer rather than the graphicsData shapes array.  We walk `currentPath`
 * and any line-only entries to render them.
 */
function renderGraphicsPoints(
  ck: CanvasKit,
  canvas: SkCanvas,
  g: PIXI.Graphics
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geometry: any = g.geometry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphicsData: any[] = geometry.graphicsData ?? []

  for (const entry of graphicsData) {
    const shape = entry.shape
    // Only interested in polygon-type shapes that come from moveTo/lineTo
    if (!shape || shape.points === undefined) continue

    const line = entry.lineStyle
    if (!line?.visible || line.width <= 0) continue

    const pts: number[] = shape.points
    if (pts.length < 4) continue

    const paint = new ck.Paint()
    paint.setStyle(ck.PaintStyle.Stroke)
    paint.setAntiAlias(true)
    paint.setStrokeWidth(line.width)
    const [r, gb, b, a] = toSkiaColor(line.color, line.alpha ?? 1)
    paint.setColor(ck.Color4f(r, gb, b, a))

    const path = new ck.Path()
    path.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) {
      path.lineTo(pts[i], pts[i + 1])
    }

    canvas.drawPath(path, paint)
    path.delete()
    paint.delete()
  }
}

// ─── Sprite renderer ─────────────────────────────────────────────────────────

/**
 * Render a PIXI.Sprite by extracting its texture pixel data and uploading it
 * to Skia as a raster image.
 *
 * The image is drawn at the sprite's anchor-adjusted origin so that the
 * transform applied by renderNode() positions it correctly.
 */
function renderSprite(
  ck: CanvasKit,
  canvas: SkCanvas,
  sprite: PIXI.Sprite
): void {
  const texture = sprite.texture
  if (!texture || !texture.valid) return

  // Extract pixel data via a temporary canvas
  const baseTexture = texture.baseTexture
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const source = (baseTexture.resource as any)?.source

  if (!(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)) {
    return
  }

  const tmpCanvas = document.createElement('canvas')
  tmpCanvas.width = texture.width
  tmpCanvas.height = texture.height
  const ctx = tmpCanvas.getContext('2d')
  if (!ctx) return

  // Draw the texture frame (handles sprite sheets / sub-textures)
  const frame = texture.frame
  ctx.drawImage(
    source,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    0,
    0,
    texture.width,
    texture.height
  )

  const imageData = ctx.getImageData(0, 0, texture.width, texture.height)
  const skImage = ck.MakeImageFromEncoded(
    // Encode as PNG bytes via another canvas
    (() => {
      const enc = document.createElement('canvas')
      enc.width = texture.width
      enc.height = texture.height
      enc.getContext('2d')!.putImageData(imageData, 0, 0)
      const dataUrl = enc.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return bytes
    })()
  )

  if (!skImage) return

  const w = sprite.width
  const h = sprite.height
  const anchorX = sprite.anchor.x * w
  const anchorY = sprite.anchor.y * h

  const src = ck.LTRBRect(0, 0, skImage.width(), skImage.height())
  const dst = ck.LTRBRect(-anchorX, -anchorY, w - anchorX, h - anchorY)

  const paint = new ck.Paint()
  paint.setAntiAlias(true)
  canvas.drawImageRect(skImage, src, dst, paint)
  paint.delete()
  skImage.delete()
}
