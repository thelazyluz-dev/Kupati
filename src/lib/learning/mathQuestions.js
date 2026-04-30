function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build a question object with shuffled options
function makeQ(question, correct, w1, w2, w3) {
  const correctStr = String(correct)
  const options = shuffle([correctStr, String(w1), String(w2), String(w3)])
  return { question, options, correctIndex: options.indexOf(correctStr) }
}

// Ensure wrong answers are unique and not equal to correct
function uniqWrongs(correct, candidates) {
  const seen = new Set([String(correct)])
  const result = []
  for (const c of candidates) {
    const s = String(c)
    if (!seen.has(s)) { seen.add(s); result.push(s) }
    if (result.length === 3) break
  }
  // fallback if not enough
  let fallback = correct + 10
  while (result.length < 3) { result.push(String(fallback)); fallback += 5 }
  return result
}

// ── Grade 1: חיבור/חיסור 1–10 ──────────────────────────────────
function grade1() {
  const add = rand(0, 1)
  if (add) {
    const a = rand(1, 9), b = rand(1, 10 - a)
    const c = a + b
    const [w1, w2, w3] = uniqWrongs(c, [c + 1, c - 1, c + 2, c - 2])
    return makeQ(`${a} + ${b} = ?`, c, w1, w2, w3)
  } else {
    const a = rand(2, 10), b = rand(1, a - 1)
    const c = a - b
    const [w1, w2, w3] = uniqWrongs(c, [c + 1, c - 1, c + 2, c + 3])
    return makeQ(`${a} − ${b} = ?`, c, w1, w2, w3)
  }
}

// ── Grade 2: חיבור/חיסור עד 100 + לוח כפל ×2,×5,×10 ──────────
function grade2() {
  const type = rand(0, 2)
  if (type === 0) {
    const a = rand(11, 89), b = rand(1, 99 - a)
    const c = a + b
    const [w1, w2, w3] = uniqWrongs(c, [c + 10, c - 10, c + 1, c - 1])
    return makeQ(`${a} + ${b} = ?`, c, w1, w2, w3)
  } else if (type === 1) {
    const b = rand(1, 50), a = rand(b + 1, 99)
    const c = a - b
    const [w1, w2, w3] = uniqWrongs(c, [c + 10, c - 10, c + 1, c - 1])
    return makeQ(`${a} − ${b} = ?`, c, w1, w2, w3)
  } else {
    const mult = [2, 5, 10][rand(0, 2)]
    const a = rand(2, 10)
    const c = a * mult
    const [w1, w2, w3] = uniqWrongs(c, [c + mult, c - mult, (a + 1) * mult, (a - 1) * mult])
    return makeQ(`${a} × ${mult} = ?`, c, w1, w2, w3)
  }
}

// ── Grade 3: לוח כפל שלם + חילוק בסיסי ───────────────────────
function grade3() {
  const mult = rand(0, 1)
  if (mult) {
    const a = rand(2, 9), b = rand(2, 10)
    const c = a * b
    const [w1, w2, w3] = uniqWrongs(c, [c + a, c - b, c + b, (a + 1) * b])
    return makeQ(`${a} × ${b} = ?`, c, w1, w2, w3)
  } else {
    const b = rand(2, 9), res = rand(2, 10)
    const a = b * res
    const [w1, w2, w3] = uniqWrongs(res, [res + 1, res - 1, res + 2, res * 2])
    return makeQ(`${a} ÷ ${b} = ?`, res, w1, w2, w3)
  }
}

// ── Grade 4: כפל דו-ספרתי + שברים בסיסי ──────────────────────
function grade4() {
  const type = rand(0, 1)
  if (type === 0) {
    const a = rand(11, 19), b = rand(2, 9)
    const c = a * b
    const [w1, w2, w3] = uniqWrongs(c, [c + b, c - a, c + 10, c - 10])
    return makeQ(`${a} × ${b} = ?`, c, w1, w2, w3)
  } else {
    const denom = [2, 4, 5][rand(0, 2)]
    const res = rand(2, 8)
    const whole = res * denom
    const [w1, w2, w3] = uniqWrongs(res, [res + 1, res - 1, res * 2, denom])
    return makeQ(`כמה זה 1/${denom} מ-${whole}?`, res, w1, w2, w3)
  }
}

// ── Grade 5: שברים + עשרוניות ─────────────────────────────────
function grade5() {
  const type = rand(0, 1)
  if (type === 0) {
    const denom = [2, 4, 5, 10][rand(0, 3)]
    const a = rand(1, denom - 1), b = rand(1, denom - a)
    const num = a + b
    const correct = num === denom ? '1' : `${num}/${denom}`
    const [w1, w2, w3] = uniqWrongs(correct, [`${num + 1}/${denom}`, `${num}/${denom + 1}`, `${num - 1}/${denom}`, '2'])
    return makeQ(`${a}/${denom} + ${b}/${denom} = ?`, correct, w1, w2, w3)
  } else {
    const a = rand(1, 8), b = rand(1, 9 - a)
    const sum = a + b
    const correct = (sum / 10).toFixed(1)
    const [w1, w2, w3] = uniqWrongs(correct, [((sum + 1) / 10).toFixed(1), ((sum - 1) / 10).toFixed(1), (sum / 10 + 1).toFixed(1)])
    return makeQ(`0.${a} + 0.${b} = ?`, correct, w1, w2, w3)
  }
}

// ── Grade 6: אחוזים + יחסים ───────────────────────────────────
function grade6() {
  const type = rand(0, 1)
  if (type === 0) {
    const pct = [10, 20, 25, 50][rand(0, 3)]
    const bases = { 10: [100, 200, 50, 80], 20: [100, 50, 200, 150], 25: [100, 200, 400, 80], 50: [100, 60, 200, 80] }
    const whole = bases[pct][rand(0, 3)]
    const c = whole * pct / 100
    const [w1, w2, w3] = uniqWrongs(c, [c + pct, c * 2, c / 2, c + 5])
    return makeQ(`כמה זה ${pct}% מ-${whole}?`, c, w1, w2, w3)
  } else {
    const a = rand(1, 4), b = rand(1, 4)
    const unit = rand(2, 5)
    const total = (a + b) * unit
    const c = a * unit
    const [w1, w2, w3] = uniqWrongs(c, [b * unit, c + 1, c - 1, total])
    return makeQ(`יחס ${a}:${b}, הסכום ${total}. מה החלק הראשון?`, c, w1, w2, w3)
  }
}

const GENERATORS = [null, grade1, grade2, grade3, grade4, grade5, grade6]

export function generateMathQuestions(grade, count = 5) {
  const gen = GENERATORS[Math.min(6, Math.max(1, grade))] || grade1
  const questions = []
  let tries = 0
  while (questions.length < count && tries < 50) {
    tries++
    const q = gen()
    // Avoid duplicate question text
    if (!questions.some(x => x.question === q.question)) questions.push(q)
  }
  return questions
}
