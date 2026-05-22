/**
 * skia/matrixUtils.ts
 *
 * Builds a Skia 3×3 affine matrix (as Float32Array[9]) from a PIXI
 * DisplayObject's position / angle / scale / pivot, matching how PIXI itself
 * computes the world-transform.
 *
 * Skia's concat() accepts a 9-element row-major matrix:
 *   [ a  b  c ]
 *   [ d  e  f ]
 *   [ g  h  i ]
 * In affine 2-D we set g=0, h=0, i=1.
 */

import type * as PIXI from 'pixi.js-legacy'
import type { CanvasKit } from './types'

/**
 * Build the local transform matrix for a single PIXI DisplayObject.
 * Mirrors PIXI's own transform calculation:
 *   T(position) · R(angle) · S(scale) · T(-pivot)
 */
export function buildLocalMatrix(_ck: CanvasKit, obj: PIXI.DisplayObject): Float32Array {
  const transform = obj.transform

  const px = transform.pivot.x
  const py = transform.pivot.y
  const sx = transform.scale.x
  const sy = transform.scale.y
  const tx = transform.position.x
  const ty = transform.position.y
  const rot = transform.rotation // radians

  const cos = Math.cos(rot)
  const sin = Math.sin(rot)

  // Combined: translate(tx,ty) · rotate(rot) · scale(sx,sy) · translate(-px,-py)
  // Written out as a single 3×3:
  const a = cos * sx
  const b = -sin * sy
  const c = tx + (cos * sx * -px) + (-sin * sy * -py)
  const d = sin * sx
  const e = cos * sy
  const f = ty + (sin * sx * -px) + (cos * sy * -py)

  // Skia 3×3 row-major [a,b,c, d,e,f, 0,0,1]
  return new Float32Array([a, b, c, d, e, f, 0, 0, 1])
}

/**
 * Multiply two Skia 3×3 matrices (both Float32Array[9]).
 */
export function multiplyMatrices(
  ck: CanvasKit,
  a: Float32Array,
  b: Float32Array
): Float32Array {
  return ck.Matrix.multiply(a, b)
}
