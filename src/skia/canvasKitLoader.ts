/**
 * skia/canvasKitLoader.ts
 *
 * Robust loader that tries every known export shape of canvaskit-wasm,
 * with full diagnostic logging so we can see exactly what Vite gives us.
 */

import type { CanvasKit } from './types'

export async function loadCanvasKit(
  onProgress?: (pct: number, msg: string) => void
): Promise<CanvasKit> {
  onProgress?.(10, 'Loading CanvasKit…')

  // Use a script tag to load canvaskit.js directly — this bypasses all
  // Vite module system issues and gives us the raw global export.
  const ck = await loadViaScriptTag()

  onProgress?.(100, 'CanvasKit ready')
  return ck
}

function loadViaScriptTag(): Promise<CanvasKit> {
  return new Promise((resolve, reject) => {
    // canvaskit.js sets window.CanvasKitInit when loaded as a plain script
    const script = document.createElement('script')
    script.src = '/node_modules/canvaskit-wasm/bin/canvaskit.js'
    script.onload = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const init = (window as any).CanvasKitInit
      if (typeof init !== 'function') {
        reject(new Error(
          'CanvasKitInit not found on window after script load. ' +
          'window keys with CanvasKit: ' +
          Object.keys(window).filter(k => k.toLowerCase().includes('canvas')).join(', ')
        ))
        return
      }
      try {
        const ck = await init({
          locateFile: (file: string) =>
            `/node_modules/canvaskit-wasm/bin/${file}`,
        })
        resolve(ck)
      } catch (e) {
        reject(e)
      }
    }
    script.onerror = () =>
      reject(new Error(
        'Failed to load script /node_modules/canvaskit-wasm/bin/canvaskit.js — ' +
        'check that node_modules is accessible from the dev server (vite fs.allow)'
      ))
    document.head.appendChild(script)
  })
}
