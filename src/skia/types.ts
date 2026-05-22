/**
 * skia/types.ts
 * Minimal TypeScript type declarations for canvaskit-wasm.
 * The npm package ships a full .d.ts in newer versions but these shims
 * ensure we compile cleanly on 0.39.x.
 */

export interface SkCanvas {
  save(): void
  restore(): void
  concat(matrix: Float32Array): void
  drawPath(path: SkPath, paint: SkPaint): void
  drawImageRect(
    image: SkImage,
    src: Float32Array,
    dst: Float32Array,
    paint: SkPaint
  ): void
  clear(color: Float32Array): void
  flush(): void
}

export interface SkPaint {
  setStyle(style: number): void
  setColor(color: Float32Array): void
  setAntiAlias(aa: boolean): void
  setStrokeWidth(w: number): void
  delete(): void
}

export interface SkPath {
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  addRect(rect: Float32Array): void
  addOval(oval: Float32Array): void
  close(): void
  delete(): void
}

export interface SkImage {
  width(): number
  height(): number
  delete(): void
}

export interface SkPDFDocument {
  beginPage(width: number, height: number): SkCanvas
  endPage(): void
  close(): Uint8Array
}

export interface SkSurface {
  getCanvas(): SkCanvas
  flush(): void
  delete(): void
}

export interface CanvasKit {
  // Surface creation
  MakeCanvasSurface(canvasId: string): SkSurface | null
  MakeSWCanvasSurface(canvas: HTMLCanvasElement): SkSurface | null

  // Paint
  Paint: new () => SkPaint
  PaintStyle: { Fill: number; Stroke: number }

  // Path
  Path: new () => SkPath

  // Colors
  Color(r: number, g: number, b: number, a?: number): Float32Array
  Color4f(r: number, g: number, b: number, a: number): Float32Array
  LTRBRect(l: number, t: number, r: number, b: number): Float32Array
  XYWHRect(x: number, y: number, w: number, h: number): Float32Array

  // Matrix helpers
  Matrix: {
    identity(): Float32Array
    multiply(a: Float32Array, b: Float32Array): Float32Array
    rotated(radians: number, px?: number, py?: number): Float32Array
    scaled(sx: number, sy: number, px?: number, py?: number): Float32Array
    translated(dx: number, dy: number): Float32Array
  }

  // Image
  MakeImageFromEncoded(data: Uint8Array): SkImage | null

  // PDF
  MakePDFDocument(): SkPDFDocument
}
