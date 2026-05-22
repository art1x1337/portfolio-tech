/**
 * ui/eventLog.ts
 * Maintains a small event log overlay in the Pixi panel.
 */

const MAX_ENTRIES = 10

export function initEventLog(): void {
  const log = document.getElementById('event-log')
  if (!log) return

  window.addEventListener('pixi-pointer', (e: Event) => {
    const { type, label } = (e as CustomEvent<{ type: 'down' | 'up'; label: string }>).detail

    const entry = document.createElement('div')
    entry.className = `log-entry ${type}`
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
    entry.textContent = `${ts}  ${label}`
    log.prepend(entry)

    // Trim old entries
    while (log.children.length > MAX_ENTRIES) {
      log.removeChild(log.lastChild!)
    }
  })
}
