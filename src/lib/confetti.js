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

// Multi-burst celebration for chore completion — more impressive
export function celebrateChore() {
  const colors = ['#f59e0b', '#fcd34d', '#fb923c', '#6366f1', '#a78bfa', '#34d399', '#f472b6']

  // First burst — center
  confetti({ particleCount: 80, spread: 90, origin: { x: 0.5, y: 0.55 }, colors })

  // Side bursts after short delays
  setTimeout(() => {
    confetti({ particleCount: 40, angle: 60,  spread: 60, origin: { x: 0, y: 0.6 }, colors })
    confetti({ particleCount: 40, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors })
  }, 200)

  // Top shower
  setTimeout(() => {
    confetti({ particleCount: 50, spread: 120, startVelocity: 20, origin: { x: 0.5, y: 0 }, colors, gravity: 0.8 })
  }, 500)
}

export function celebrateSmall() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
  })
}
