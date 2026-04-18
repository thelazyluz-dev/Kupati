const _coinTargets = {}

export function registerCoinTarget(childId, el) {
  if (el) _coinTargets[childId] = el
}

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
  const arcY = dy * 0.45 - 70

  const coin = document.createElement('div')
  coin.textContent = '🪙'
  coin.style.cssText = [
    'position:fixed',
    `left:${startX}px`,
    `top:${startY}px`,
    'font-size:42px',
    'line-height:1',
    'pointer-events:none',
    'z-index:9999',
    'transform:translate(-50%,-50%)',
    'will-change:transform,opacity',
    'user-select:none',
    '-webkit-user-select:none',
    'filter:drop-shadow(0 3px 10px rgba(0,0,0,0.28))',
  ].join(';')
  document.body.appendChild(coin)

  const DURATION = 1800

  onFly?.()

  coin.animate(
    [
      { offset: 0,    transform: 'translate(-50%,-50%) scale(1.0)  rotate(0deg)',   opacity: 1 },
      { offset: 0.10, transform: 'translate(-50%,-50%) scale(1.18) rotate(18deg)',  opacity: 1 },
      {
        offset: 0.48,
        transform: `translate(calc(-50% + ${arcX}px), calc(-50% + ${arcY}px)) scale(1.05) rotate(190deg)`,
        opacity: 1,
      },
      {
        offset: 0.88,
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.72) rotate(348deg)`,
        opacity: 1,
      },
      {
        offset: 1,
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.0) rotate(360deg)`,
        opacity: 0,
      },
    ],
    { duration: DURATION, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }
  ).finished.then(() => {
    coin.remove()
    // Ring fires only AFTER coin animation fully completes — coin enters slot, then slot reacts
    onLand?.()
    const ring = document.createElement('div')
    ring.style.cssText = [
      'position:fixed',
      `left:${endX}px`,
      `top:${endY}px`,
      'width:44px',
      'height:44px',
      'border-radius:50%',
      'border:3px solid #f5a623',
      'pointer-events:none',
      'z-index:9998',
      'transform:translate(-50%,-50%) scale(0.15)',
      'opacity:1',
    ].join(';')
    document.body.appendChild(ring)
    ring.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.15)', opacity: 0.95 },
        { transform: 'translate(-50%,-50%) scale(2.4)',  opacity: 0    },
      ],
      { duration: 420, easing: 'ease-out' }
    ).finished.then(() => ring.remove())
  })
}
