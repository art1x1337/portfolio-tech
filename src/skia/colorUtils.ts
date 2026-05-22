/**
 * skia/colorUtils.ts
 * Utility helpers to convert the colour formats that PIXI uses (hex numbers,
 * CSS hex strings) into the four-component float arrays that Skia expects.
 */

/**
 * Convert any PIXI-compatible colour value to a [r, g, b, a] tuple where
 * each component is in the range 0..1.
 *
 * @param color  A CSS hex string ("#rrggbb" or "#rgb") or a numeric value
 *               (0xRRGGBB) as used by PIXI.
 * @param alpha  Alpha in 0..1 range (default 1).
 */
export function toSkiaColor(
  color: string | number | undefined,
  alpha = 1
): [number, number, number, number] {
  if (color === undefined || color === null) return [1, 1, 1, alpha]

  if (typeof color === 'number') {
    const r = ((color >> 16) & 0xff) / 255
    const g = ((color >> 8) & 0xff) / 255
    const b = (color & 0xff) / 255
    return [r, g, b, alpha]
  }

  // CSS hex string
  let hex = color.replace('#', '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const num = parseInt(hex, 16)
  return [
    ((num >> 16) & 0xff) / 255,
    ((num >> 8) & 0xff) / 255,
    (num & 0xff) / 255,
    alpha,
  ]
}
