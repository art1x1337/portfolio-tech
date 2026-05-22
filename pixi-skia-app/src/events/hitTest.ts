/**
 * events/hitTest.ts
 *
 * Mirrors pointer events from the Skia canvas back into the PIXI display
 * tree so that objects with pointerdown / pointerup listeners fire correctly
 * on BOTH canvases.
 *
 * Approach
 * ────────
 * PIXI already handles hit-testing on its own canvas.  For the Skia canvas
 * we perform a manual recursive hit-test using the world transforms that PIXI
 * has already computed (`worldTransform`), then call `emit()` on the matching
 * display object.
 *
 * We use the PIXI worldTransform (computed after the ticker runs) so we don't
 * need to duplicate the matrix math.
 */

import * as PIXI from 'pixi.js-legacy'

type PixiEventType = 'pointerdown' | 'pointerup'

/**
 * Attach pointer event listeners to a Skia HTMLCanvasElement that forward
 * hits to the matching PIXI objects in `container`.
 *
 * @param skiaCanvas   The <canvas> element used by Skia
 * @param container    Root PIXI container to hit-test against
 */
export function attachSkiaPointerEvents(
  skiaCanvas: HTMLCanvasElement,
  container: PIXI.Container
): () => void {
  const handleDown = (e: PointerEvent) =>
    dispatch(e, skiaCanvas, container, 'pointerdown')
  const handleUp = (e: PointerEvent) =>
    dispatch(e, skiaCanvas, container, 'pointerup')

  skiaCanvas.addEventListener('pointerdown', handleDown)
  skiaCanvas.addEventListener('pointerup', handleUp)

  // Return a cleanup function
  return () => {
    skiaCanvas.removeEventListener('pointerdown', handleDown)
    skiaCanvas.removeEventListener('pointerup', handleUp)
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function dispatch(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
  container: PIXI.Container,
  eventType: PixiEventType
): void {
  const rect = canvas.getBoundingClientRect()
  // Scale mouse position to canvas logical pixels
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY

  // Walk the tree depth-first (front-to-back) and fire on first hit
  const hit = hitTestNode(container, x, y)
  if (hit) {
    // Construct a minimal fake PIXI InteractionEvent
    const fakeEvent = {
      global: new PIXI.Point(x, y),
      target: hit,
      currentTarget: hit,
      type: eventType,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(hit as any).emit(eventType, fakeEvent)
  }
}

/**
 * Recursively hit-test the PIXI display tree.
 * Returns the deepest interactive object that contains (x, y) in world space,
 * or null if nothing is hit.
 */
function hitTestNode(
  node: PIXI.DisplayObject,
  x: number,
  y: number
): PIXI.DisplayObject | null {
  if (!node.visible) return null

  // Recurse into containers (children rendered last = on top, test first)
  if (node instanceof PIXI.Container) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = hitTestNode(node.children[i] as PIXI.DisplayObject, x, y)
      if (hit) return hit
    }
  }

  // Check if this node is interactive and the point is inside its bounds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((node as any).eventMode === 'static' || (node as any).interactive) {
    const bounds = node.getBounds()
    if (bounds.contains(x, y)) {
      return node
    }
  }

  return null
}
