/**
 * pixi/scene.ts
 * Defines 3 distinct PIXI.Container scenes used for the scene-switcher demo.
 * Each scene registers pointerdown / pointerup listeners that emit a custom
 * DOM event so the UI can display an event log.
 */

import * as PIXI from 'pixi.js-legacy'

// Helper: fire a DOM custom event from the Pixi canvas so the UI can react
function emitPointerEvent(type: 'down' | 'up', label: string): void {
  window.dispatchEvent(
    new CustomEvent('pixi-pointer', { detail: { type, label } })
  )
}

// ─── Scene 1 ──────────────────────────────────────────────────────────────────
// The example scene from the task specification (ellipse, rect, two lines)
export function buildScene1(): PIXI.Container {
  const mainContainer = new PIXI.Container()
  const subContainer = new PIXI.Container()

  const g1 = new PIXI.Graphics()
  const g2 = new PIXI.Graphics()
  const g3 = new PIXI.Graphics()
  const g4 = new PIXI.Graphics()

  // Red ellipse — interactive
  g1.beginFill('#ff0000').drawEllipse(0, 0, 200, 100).endFill()
  g1.position.set(200, 100)
  g1.angle = 30
  g1.eventMode = 'static'
  g1.cursor = 'pointer'
  g1.on('pointerdown', () => {
    console.log('g1 pointerdown!')
    emitPointerEvent('down', 'Red Ellipse ↓')
  })
  g1.on('pointerup', () => {
    console.log('g1 pointerup!')
    emitPointerEvent('up', 'Red Ellipse ↑')
  })

  // Blue rect — interactive
  g2.beginFill('#0000ff').drawRect(-50, -75, 100, 150).endFill()
  g2.position.set(120, 60)
  g2.angle = 15
  g2.scale.set(1.5, 1.7)
  g2.eventMode = 'static'
  g2.cursor = 'pointer'
  g2.on('pointerdown', () => {
    console.log('g2 pointerdown!')
    emitPointerEvent('down', 'Blue Rect ↓')
  })
  g2.on('pointerup', () => {
    console.log('g2 pointerup!')
    emitPointerEvent('up', 'Blue Rect ↑')
  })

  // White line
  g3.lineStyle(10, '#ffffff', 1).moveTo(0, 0).lineTo(150, 100)
  g3.angle = -20

  // Yellow line
  g4.lineStyle(10, '#ffff00', 1).moveTo(0, 70).lineTo(150, -30)
  g4.angle = 20

  subContainer.position.set(75, 50)
  subContainer.addChild(g3, g4)
  mainContainer.addChild(subContainer, g1, g2)

  return mainContainer
}

// ─── Scene 2 ──────────────────────────────────────────────────────────────────
// Concentric rings + a rotated star polygon + interactive circle
export function buildScene2(): PIXI.Container {
  const container = new PIXI.Container()

  // Background circles (concentric rings)
  const rings = new PIXI.Graphics()
  const colors = ['#1e1b4b', '#312e81', '#4338ca', '#6366f1', '#818cf8']
  for (let i = 0; i < colors.length; i++) {
    rings
      .lineStyle(6, colors[i], 1)
      .drawCircle(300, 200, 30 + i * 40)
  }
  container.addChild(rings)

  // Star polygon
  const star = new PIXI.Graphics()
  star.beginFill('#f59e0b', 0.85)
  drawStar(star, 0, 0, 7, 80, 35)
  star.endFill()
  star.position.set(300, 200)
  star.angle = 12
  star.eventMode = 'static'
  star.cursor = 'pointer'
  star.on('pointerdown', () => emitPointerEvent('down', 'Star ↓'))
  star.on('pointerup',   () => emitPointerEvent('up',   'Star ↑'))
  container.addChild(star)

  // Small interactive dot
  const dot = new PIXI.Graphics()
  dot.beginFill('#10b981').drawCircle(0, 0, 20).endFill()
  dot.position.set(130, 300)
  dot.eventMode = 'static'
  dot.cursor = 'pointer'
  dot.on('pointerdown', () => emitPointerEvent('down', 'Green Dot ↓'))
  dot.on('pointerup',   () => emitPointerEvent('up',   'Green Dot ↑'))
  container.addChild(dot)

  // Cross / plus shape
  const cross = new PIXI.Graphics()
  cross.beginFill('#ef4444')
  cross.drawRect(-8, -50, 16, 100)
  cross.drawRect(-50, -8, 100, 16)
  cross.endFill()
  cross.position.set(470, 100)
  cross.angle = 45
  container.addChild(cross)

  return container
}

// ─── Scene 3 ──────────────────────────────────────────────────────────────────
// Grid of rectangles with varying rotations + interactive diamond
export function buildScene3(): PIXI.Container {
  const container = new PIXI.Container()
  const palette = ['#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#4f46e5']

  // Grid
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const g = new PIXI.Graphics()
      const color = palette[(row * 4 + col) % palette.length]
      g.beginFill(color, 0.75).drawRoundedRect(-30, -20, 60, 40, 6).endFill()
      g.lineStyle(2, '#ffffff', 0.3)
      g.drawRoundedRect(-30, -20, 60, 40, 6)
      g.position.set(80 + col * 120, 70 + row * 110)
      g.angle = (row + col) * 7 - 10
      g.eventMode = 'static'
      g.cursor = 'pointer'
      const label = `Cell[${row},${col}]`
      g.on('pointerdown', () => emitPointerEvent('down', `${label} ↓`))
      g.on('pointerup',   () => emitPointerEvent('up',   `${label} ↑`))
      container.addChild(g)
    }
  }

  // Big diamond
  const diamond = new PIXI.Graphics()
  diamond.beginFill('#f0abfc', 0.6)
  diamond.moveTo(0, -70).lineTo(50, 0).lineTo(0, 70).lineTo(-50, 0).closePath()
  diamond.endFill()
  diamond.lineStyle(3, '#ffffff', 0.5)
  diamond.moveTo(0, -70).lineTo(50, 0).lineTo(0, 70).lineTo(-50, 0).closePath()
  diamond.position.set(300, 290)
  diamond.angle = 15
  diamond.scale.set(1.3)
  diamond.eventMode = 'static'
  diamond.cursor = 'pointer'
  diamond.on('pointerdown', () => emitPointerEvent('down', 'Diamond ↓'))
  diamond.on('pointerup',   () => emitPointerEvent('up',   'Diamond ↑'))
  container.addChild(diamond)

  return container
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Draws a star polygon into a PIXI.Graphics object.
 * @param g      target Graphics
 * @param cx, cy center
 * @param points number of points
 * @param outer  outer radius
 * @param inner  inner radius
 */
function drawStar(
  g: PIXI.Graphics,
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number
): void {
  const step = Math.PI / points
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const x = cx + Math.cos(i * step - Math.PI / 2) * r
    const y = cy + Math.sin(i * step - Math.PI / 2) * r
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
}
