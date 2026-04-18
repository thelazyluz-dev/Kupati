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

  // Flying coin
  const coin = document.createElement('div')
  coin.style.cssText = [
    'position:fixed',
    `left:${startX}px`,
    `top:${startY}px`,
    'width:40px',
    'height:40px',
    'border-radius:50%',
    'background:radial-gradient(circle at 35% 35%, #ffe066, #f5a623 60%, #c97f00)',
    'box-shadow:0 3px 14px rgba(0,0,0,0.38),inset 0 1px 3px rgba(255,255,255,0.6)',
    'pointer-events:none',
    'z-index:9999',
    'transform:translate(-50%,-50%)',
    'will-change:transform,opacity',
  ].join(';')
  document.body.appendChild(coin)

  const DURATION = 1800

  onFly?.()

  coin.animate(
    [
      { offset: 0,    transform: 'translate(-50%,-50%) scale(2.8) rotate(0deg)',   opacity: 1 },
      {
        offset: 0.45,
        transform: `translate(calc(-50% + ${arcX}px), calc(-50% + ${arcY}px)) scale(1.1) rotate(185deg)`,
        opacity: 1,
      },
      {
        offset: 0.85,
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.28) rotate(340deg)`,
        opacity: 1,
      },
      {
        offset: 1,
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0) rotate(360deg)`,
        opacity: 0,
      },
    ],
    { duration: DURATION, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }
  ).finished.then(() => coin.remove())

  // Landing ring — expands from target as coin arrives
  const ringDelay = DURATION * 0.82
  setTimeout(() => {
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
      'transform:translate(-50%,-50%) scale(0.2)',
      'opacity:1',
    ].join(';')
    document.body.appendChild(ring)
    ring.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0.9 },
        { transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0   },
      ],
      { duration: 500, easing: 'ease-out' }
    ).finished.then(() => ring.remove())
  }, ringDelay)
}
