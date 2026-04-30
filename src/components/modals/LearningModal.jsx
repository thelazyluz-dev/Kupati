import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { celebrateGoal } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'
import { generateMathQuestions } from '../../lib/learning/mathQuestions.js'
import { getHebrewQuestions } from '../../lib/learning/hebrewQuestions.js'
import { getEnglishQuestions } from '../../lib/learning/englishQuestions.js'
import { getGeneralQuestions } from '../../lib/learning/generalQuestions.js'

const SUBJECTS = {
  math:    { label: 'מתמטיקה',  emoji: '🔢', color: 'from-blue-400 to-indigo-500',    bg: 'bg-blue-50',    btn: 'bg-blue-500 hover:bg-blue-600',    ring: 'ring-blue-300' },
  hebrew:  { label: 'עברית',    emoji: '📖', color: 'from-emerald-400 to-green-500',  bg: 'bg-emerald-50', btn: 'bg-emerald-500 hover:bg-emerald-600', ring: 'ring-emerald-300' },
  english: { label: 'אנגלית',   emoji: '🔤', color: 'from-sky-400 to-blue-500',       bg: 'bg-sky-50',     btn: 'bg-sky-500 hover:bg-sky-600',       ring: 'ring-sky-300' },
  general: { label: 'ידע כללי', emoji: '🌍', color: 'from-amber-400 to-orange-500',   bg: 'bg-amber-50',   btn: 'bg-amber-500 hover:bg-amber-600',   ring: 'ring-amber-300' },
}

const STATUS_LABEL = {
  available:        { text: 'מוכן!',      color: 'bg-green-100 text-green-700' },
  in_progress:      { text: 'בתהליך…',    color: 'bg-blue-100 text-blue-700'   },
  needs_correction: { text: 'יש תיקון',   color: 'bg-amber-100 text-amber-700' },
  done:             { text: '✅ הושלם',   color: 'bg-gray-100 text-gray-500'   },
}

// ── Dots progress ─────────────────────────────────────────────
function Dots({ total, current, wrong = [] }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: total }, (_, i) => {
        const done = i < current
        const isWrong = done && wrong.includes(i)
        return (
          <div key={i} className={[
            'w-3 h-3 rounded-full transition-all duration-300',
            i === current ? 'scale-125 bg-white ring-2 ring-white/60' :
            done ? (isWrong ? 'bg-red-300' : 'bg-white') :
            'bg-white/30',
          ].join(' ')} />
        )
      })}
    </div>
  )
}

// ── Answer button ──────────────────────────────────────────────
function AnswerBtn({ text, state, onClick, dir }) {
  const base = 'w-full py-5 px-3 rounded-2xl font-bold text-xl transition-all duration-200 active:scale-95 border-2 text-center leading-snug'
  const styles = {
    idle:    'bg-white border-gray-200 text-gray-800 hover:border-gray-300 hover:shadow-sm',
    correct: 'bg-green-100 border-green-400 text-green-800 scale-100',
    wrong:   'bg-red-100   border-red-400   text-red-800   scale-100',
    reveal:  'bg-green-100 border-green-400 text-green-800',
  }
  const isRtl = dir !== 'ltr'
  return (
    <button
      type="button"
      onClick={state === 'idle' ? onClick : undefined}
      className={`${base} ${styles[state] || styles.idle}`}
      dir={dir || 'rtl'}
      style={isRtl ? { fontFamily: "'Noto Serif Hebrew', 'David', serif", fontSize: '1.2rem' } : { fontSize: '1.35rem' }}
    >
      {text}
    </button>
  )
}

// ── Hub — choose subject ───────────────────────────────────────
function Hub({ childLearning, onSelect, onClose }) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-br from-violet-500 to-purple-600 px-5 pt-10 pb-6 text-white text-center rounded-b-[2rem]">
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">×</button>
        <div className="text-5xl mb-2">🎓</div>
        <h1 className="text-2xl font-black">למד וצבור כוכבים!</h1>
        <p className="text-white/70 text-sm mt-1">בחר מקצוע לסשן של היום</p>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(SUBJECTS).map(([key, sub]) => {
            const sess = childLearning[key]
            const sl = STATUS_LABEL[sess?.status] || STATUS_LABEL.available
            const done = sess?.status === 'done'
            const stars = (sess?.starsFirst || 0) + (done && sess?.corrections?.length > 0 ? 1 : 0)

            return (
              <button
                key={key}
                type="button"
                onClick={() => !done && onSelect(key)}
                className={[
                  'rounded-3xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 text-center',
                  done ? 'bg-gray-50 opacity-60' : `bg-gradient-to-br ${sub.color} shadow-lg text-white`,
                ].join(' ')}
              >
                <span className="text-4xl">{sub.emoji}</span>
                <p className={`font-black text-base ${done ? 'text-gray-500' : 'text-white'}`}>{sub.label}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sl.color}`}>{sl.text}</span>
                {stars > 0 && (
                  <p className={`text-lg font-black ${done ? 'text-amber-500' : 'text-yellow-200'}`}>+{stars}⭐</p>
                )}
              </button>
            )
          })}
        </div>

        <div className="bg-violet-50 rounded-2xl p-4 text-center text-sm text-violet-600 font-semibold">
          💡 5 שאלות · 1⭐ לתשובה נכונה · +1⭐ בונוס על תיקון טעויות
        </div>
      </div>
    </div>
  )
}

// ── Session — questions ────────────────────────────────────────
function Session({ subject, session, onAnswer, onBack }) {
  const sub = SUBJECTS[subject]
  const isCorrection = session.phase === 'correction'
  const questions = isCorrection
    ? session.corrections.map(i => session.questions[i])
    : session.questions
  const progress = isCorrection ? session.correctionProgress : session.progress
  const total = questions.length
  const currentQ = questions[progress]

  const [reveal, setReveal] = useState(null) // { chosen, correct }
  const timerRef = useRef(null)
  const isLtr = subject === 'math' || subject === 'english'

  useEffect(() => () => clearTimeout(timerRef.current), [])

  if (!currentQ) return null

  function handleAnswer(idx) {
    if (reveal) return
    const correct = idx === currentQ.correctIndex
    setReveal({ chosen: idx, correct })
    if (correct) sounds.correctAnswer?.()
    else sounds.wrongAnswer?.()
    timerRef.current = setTimeout(() => {
      setReveal(null)
      onAnswer(correct)
    }, 1300)
  }

  function btnState(idx) {
    if (!reveal) return 'idle'
    if (idx === currentQ.correctIndex) return 'reveal'
    if (idx === reveal.chosen) return reveal.correct ? 'correct' : 'wrong'
    return 'idle'
  }

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br ${sub.color}`}>
      {/* Header */}
      <div className="px-5 pt-10 pb-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">‹</button>
          <span className="font-bold text-white/80 text-sm">
            {isCorrection ? '🔄 תיקון טעויות' : sub.label}
          </span>
          <span className="font-bold text-white text-sm">{progress + 1}/{total}</span>
        </div>
        <Dots
          total={total}
          current={progress}
          wrong={isCorrection ? [] : session.answers.map((a, i) => a === false ? i : -1).filter(i => i >= 0)}
        />
      </div>

      {/* Question card */}
      <div className="flex-1 bg-white rounded-t-[2rem] px-5 pt-6 pb-4 flex flex-col gap-4 overflow-y-auto">
        <div className="text-center mb-2">
          {currentQ.question.includes('\n') ? (() => {
            const [a, b] = currentQ.question.split('\n')
            const emojiFirst = a.length <= 4
            const textPart = emojiFirst ? b : a
            const emojiPart = emojiFirst ? a : b
            return (
              <div className="space-y-2">
                <p className="font-black text-gray-800 text-2xl"
                   dir={isLtr ? 'ltr' : 'rtl'}
                   style={isLtr ? {} : { fontFamily: "'Noto Serif Hebrew', 'David', serif" }}>
                  {textPart}
                </p>
                <p className="text-8xl leading-none select-none">{emojiPart}</p>
              </div>
            )
          })() : (
            <p className="text-3xl font-black text-gray-800 leading-snug whitespace-pre-line"
               dir={isLtr ? 'ltr' : 'rtl'}
               style={isLtr ? { fontSize: '2rem' } : { fontFamily: "'Noto Serif Hebrew', 'David', serif" }}>
              {currentQ.question}
            </p>
          )}
        </div>

        {/* Answer grid */}
        <div className="grid grid-cols-2 gap-3">
          {currentQ.options.map((opt, idx) => (
            <AnswerBtn
              key={idx}
              text={opt}
              state={btnState(idx)}
              onClick={() => handleAnswer(idx)}
              dir={isLtr ? 'ltr' : 'rtl'}
            />
          ))}
        </div>

        {reveal && (
          <div className={`text-center text-2xl font-black animate-bounce-in ${reveal.correct ? 'text-green-600' : 'text-red-500'}`}>
            {reveal.correct ? '✅ כל הכבוד!' : '❌ לא נכון'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Summary ────────────────────────────────────────────────────
function Summary({ subject, session, onCorrection, onClose, starsAwarded }) {
  const sub = SUBJECTS[subject]
  const needsCorrection = session.status === 'needs_correction'
  const isDone = session.status === 'done'
  const correct = session.starsFirst
  const total = session.questions.length
  const perfect = correct === total

  useEffect(() => {
    if (isDone) { celebrateGoal(); sounds.goal?.() }
  }, [isDone])

  return (
    <div className="flex flex-col h-full">
      <div className={`bg-gradient-to-br ${sub.color} px-5 pt-12 pb-8 text-white text-center rounded-b-[2rem]`}>
        <div className="text-6xl mb-3">
          {isDone ? '🏆' : perfect ? '🌟' : needsCorrection ? '📝' : '⭐'}
        </div>
        <h2 className="text-2xl font-black">
          {isDone ? 'מעולה! הכל הושלם!' : perfect ? 'מושלם!' : `${correct} מתוך ${total} נכון`}
        </h2>
      </div>

      <div className="flex-1 p-5 space-y-4">
        {/* Stars */}
        <div className="bg-amber-50 rounded-2xl p-4 text-center border-2 border-amber-200">
          {isDone ? (
            <>
              <p className="text-amber-700 font-bold text-sm mb-1">כוכבים שהרווחת</p>
              <p className="text-5xl font-black text-amber-500">+{starsAwarded}⭐</p>
              {session.corrections.length > 0 && (
                <p className="text-xs text-amber-500 mt-1">כולל +1⭐ בונוס על תיקון</p>
              )}
            </>
          ) : needsCorrection ? (
            <>
              <p className="text-amber-700 font-bold text-sm mb-1">כוכבים מוקפאים עד תיקון</p>
              <p className="text-5xl font-black text-amber-400">⏳ {correct}⭐</p>
              <p className="text-xs text-amber-500 mt-1">תקן {session.corrections.length} טעויות → קבל הכוכבים + 1⭐ בונוס</p>
            </>
          ) : (
            <>
              <p className="text-green-700 font-bold text-sm mb-1">כוכבים שהרווחת</p>
              <p className="text-5xl font-black text-green-500">+{correct}⭐</p>
            </>
          )}
        </div>

        {/* Results row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 rounded-2xl p-3 text-center border border-green-200">
            <p className="text-2xl font-black text-green-600">{correct}</p>
            <p className="text-xs text-green-500 font-semibold">נכון ✅</p>
          </div>
          <div className="flex-1 bg-red-50 rounded-2xl p-3 text-center border border-red-200">
            <p className="text-2xl font-black text-red-500">{session.corrections.length}</p>
            <p className="text-xs text-red-400 font-semibold">טעויות ❌</p>
          </div>
        </div>

        {needsCorrection && (
          <button
            type="button"
            onClick={onCorrection}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black text-xl shadow-lg active:scale-95 transition-transform"
          >
            🔄 תקן טעויות וקבל כוכבים!
          </button>
        )}

        {isDone ? (
          <div className="flex flex-col items-center gap-2 mt-2">
            <span className="text-3xl animate-bounce">👇</span>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-6 rounded-3xl bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-3xl shadow-xl active:scale-95 transition-transform ring-4 ring-green-300"
            >
              🎉 סיום!
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold text-lg active:scale-95 transition-transform"
          >
            חזרה
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────
export default function LearningModal() {
  const {
    closeModal, modalData,
    children, getChildLearning, startLearningSession, answerLearningQuestion, startLearningCorrection,
    adjustStars, addTransaction,
  } = useApp()

  const { childId } = modalData || {}
  const child = children?.find(c => c.id === childId)
  const grade = child?.grade || 1

  const [view, setView]       = useState('hub')   // hub | session | summary
  const [subject, setSubject] = useState(null)
  const [starsAwarded, setStarsAwarded] = useState(0)

  const childLearning = getChildLearning(childId)
  const session = subject ? childLearning[subject] : null

  function shuffleOpts(q) {
    const order = [0, 1, 2, 3]
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return { ...q, options: order.map(i => q.options[i]), correctIndex: order.indexOf(q.correctIndex) }
  }

  function openSubject(subj) {
    setSubject(subj)
    const sess = childLearning[subj]
    // Resume correction summary — don't restart
    if (sess?.status === 'needs_correction') {
      setView('summary')
      return
    }
    const questions = (subj === 'math' ? generateMathQuestions(grade, 5)
      : subj === 'english' ? getEnglishQuestions(grade, 5)
      : subj === 'general' ? getGeneralQuestions(5)
      : getHebrewQuestions(grade, 5)
    ).map(shuffleOpts)
    startLearningSession(childId, subj, grade, questions)
    setView('session')
  }

  function handleAnswer(isCorrect) {
    answerLearningQuestion(childId, subject, isCorrect)
    // Check next tick (state not yet updated here)
  }

  // Watch for session completion to switch to summary
  useEffect(() => {
    if (view !== 'session' || !subject) return
    const sess = childLearning[subject]
    if (sess.status === 'needs_correction' || sess.status === 'done') {
      if (sess.status === 'done') {
        const bonus = sess.corrections.length > 0 ? 1 : 0
        const total = sess.starsFirst + bonus
        if (total > 0) {
          adjustStars(childId, total)
          addTransaction(childId, {
            type: 'learning',
            amount: total,
            currency: 'stars',
            description: `📚 ${SUBJECTS[subject].label} — ${sess.starsFirst}/5 נכון`,
          })
          setStarsAwarded(total)
        }
      }
      setView('summary')
    }
  }, [childLearning, view, subject]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartCorrection() {
    startLearningCorrection(childId, subject)
    setView('session')
  }

  if (!child) return null

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col overflow-hidden">
      {view === 'hub' && (
        <Hub
          childLearning={childLearning}
          onSelect={openSubject}
          onClose={closeModal}
        />
      )}

      {view === 'session' && subject && session && (
        <Session
          subject={subject}
          session={session}
          onAnswer={handleAnswer}
          onBack={() => setView('hub')}
        />
      )}

      {view === 'summary' && subject && session && (
        <Summary
          subject={subject}
          session={session}
          starsAwarded={starsAwarded}
          onCorrection={handleStartCorrection}
          onClose={() => setView('hub')}
        />
      )}
    </div>
  )
}
