export function flyCoinToSlotMachine(sourceRect, targetRect) {
  const startX = sourceRect.left + sourceRect.width  / 2
  const startY = sourceRect.top  + sourceRect.height / 2

  // Target: center of the back button (or fallback top-left)
  const endX = targetRect ? targetRect.left + targetRect.width  / 2 : 44
  const endY = targetRect ? targetRect.top  + targetRect.height / 2 : 60

  const dx = endX - startX
  const dy = endY - startY

  // Arc control point: perpendicular bulge for a curved path
  const arcX = dx * 0.25 - Math.sign(dx) * 40
  const arcY = dy * 0.45 - 60

  const coin = document.createElement('div')
  coin.style.cssText = [
    'position:fixed',
    `left:${startX}px`,
    `top:${startY}px`,
    'width:28px',
    'height:28px',
    'border-radius:50%',
    'background:radial-gradient(circle at 35% 35%, #ffe066, #f5a623 60%, #c97f00)',
    'box-shadow:0 2px 8px rgba(0,0,0,0.35),inset 0 1px 2px rgba(255,255,255,0.5)',
    'pointer-events:none',
    'z-index:9999',
    'transform:translate(-50%,-50%)',
    'will-change:transform,opacity',
  ].join(';')

  document.body.appendChild(coin)

  coin.animate(
    [
      { offset: 0,    transform: 'translate(-50%,-50%) scale(0)   rotate(0deg)',   opacity: 0 },
      { offset: 0.12, transform: 'translate(-50%,-50%) scale(1.4) rotate(20deg)',  opacity: 1 },
      {
        offset: 0.55,
        transform: `translate(calc(-50% + ${arcX}px), calc(-50% + ${arcY}px)) scale(1.05) rotate(200deg)`,
        opacity: 1,
      },
      {
        offset: 1,
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.25) rotate(360deg)`,
        opacity: 0,
      },
    ],
    { duration: 820, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
  ).finished.then(() => coin.remove())
}
