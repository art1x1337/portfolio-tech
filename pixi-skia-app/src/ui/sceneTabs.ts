/**
 * ui/sceneTabs.ts
 * Builds scene-tab buttons and wires prev/next navigation.
 */

export interface SceneTabsOptions {
  count: number
  names: string[]
  onSwitch: (index: number) => void
}

export function initSceneTabs(opts: SceneTabsOptions): (index: number) => void {
  const tabsWrap = document.getElementById('scene-tabs')!
  const label = document.getElementById('scene-label')!
  const btnPrev = document.getElementById('btn-prev') as HTMLButtonElement
  const btnNext = document.getElementById('btn-next') as HTMLButtonElement

  let current = 0

  // Build tab pills
  const pills: HTMLButtonElement[] = opts.names.map((name, i) => {
    const btn = document.createElement('button')
    btn.className = 'btn' + (i === 0 ? ' active' : '')
    btn.textContent = name
    btn.addEventListener('click', () => switchTo(i))
    tabsWrap.appendChild(btn)
    return btn
  })

  function switchTo(index: number): void {
    current = index
    pills.forEach((p, i) => p.classList.toggle('active', i === index))
    label.textContent = `Scene ${index + 1} / ${opts.count}`
    btnPrev.disabled = index === 0
    btnNext.disabled = index === opts.count - 1
    opts.onSwitch(index)
  }

  btnPrev.addEventListener('click', () => { if (current > 0) switchTo(current - 1) })
  btnNext.addEventListener('click', () => { if (current < opts.count - 1) switchTo(current + 1) })

  // Initialise
  btnPrev.disabled = true
  switchTo(0)

  // Expose an external setter (used by auto-play timer etc.)
  return switchTo
}
