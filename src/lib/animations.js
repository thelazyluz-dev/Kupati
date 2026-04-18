// Module-level registry: childId → DOM element (the spin/slot target button)
const _coinTargets = {}

export function registerCoinTarget(childId, el) {
  if (el) _coinTargets[childId] = el
}

// Fire a coin from a screen-space point toward the registered target for childId.
// onFly fires immediately (flying sound), onLand fires when coin arrives (landing sound).
export function fireCoin(childId, srcX, srcY, { onFly, onLand } = {}) {
  const sourceRect = { left: srcX, top: srcY, width: 0, height: 0 }
  const targetEl   = _coinTargets[childId]
  const targetRect = targetEl?.getBoundingClientRect() ?? null
  flyCoinToSlotMachine(sourceRect, targetRect, { onFly, onLand })
}

export function flyCoinToSlotMachine(sourceRect, targetRect, { onFly, onLand } = {}) {
  const startX = sourceRect.left + sourceRect.width  / 2
  const startY = sourceRect.top  + sourceRect.height / 2

  const endX = targetRect ? targetRect.left + targetRect.width  / 2 : 44
  const endY = targetRect ? targetRect.top  + targetRect.height / 2 : 60

  const dx = endX - startX
  const dy = endY - startY

  const arcX = dx * 0.25 - Math.sign(dx) * 40
  const arcY = dy * 0.45 - 60

  const coin = document.createElement('div')
  coin.style.cssText = [
    'position:fixed',
    `left:${startX}px`,
    `top:${startY}px`,
    'width:36px',
    'height:36px',
    'border-radius:50%',
    'background:radial-gradient(circle at 35% 35%, #ffe066, #f5a623 60%, #c97f00)',
    'box-shadow:0 3px 12px rgba(0,0,0,0.4),inset 0 1px 3px rgba(255,255,255,0.55)',
    'pointer-events:none',
    'z-index:9999',
    'transform:translate(-50%,-50%)',
    'will-change:transform,opacity',
  ].join(';')

  document.body.appendChild(coin)

  const DURATION = 1600

  onFly?.()
  // Landing sound fires just before coin disappears at target
  setTimeout(() => onLand?.(), DURATION * 0.88)

  coin.animate(
    [
      { offset: 0,    transform: 'translate(-50%,-50%) scale(2.5) rotate(0deg)',   opacity: 1 },
      {
        offset: 0.45,
        transform: `translate(calc(-50% + ${arcX}px), calc(-50% + ${arcY}px)) scale(1.0) rotate(180deg)`,
        opacity: 1,
      },
      {
        offset: 1,
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.08) rotate(360deg)`,
        opacity: 0,
      },
    ],
    { duration: DURATION, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
  ).finished.then(() => coin.remove())
}
