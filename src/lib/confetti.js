import confetti from 'canvas-confetti'

export function celebrateGoal() {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })
    if (Date.now() < animationEnd) requestAnimationFrame(frame)
  }
  frame()
}

export function celebrateStars() {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#f59e0b', '#fcd34d', '#fde68a', '#6366f1', '#a78bfa'],
  })
}

export function celebrateSmall() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
  })
}
