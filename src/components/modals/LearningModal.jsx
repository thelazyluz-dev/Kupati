import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { celebrateGoal } from '../../lib/confetti.js'
import { sounds } from '../../lib/sounds.js'

const SUBJECTS = {
  math:   { label: 'מתמטיקה', emoji: '🔢', color: 'from-blue-400 to-indigo-500',   bg: 'bg-blue-50',   btn: 'bg-blue-500 hover:bg-blue-600',   ring: 'ring-blue-300' },
  hebrew: { label: 'עברית',   emoji: '📖', color: 'from-emerald-400 to-green-500', bg: 'bg-emerald-50', btn: 'bg-emerald-500 hover:bg-emerald-600', ring: 'ring-emerald-300' },
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
function AnswerBtn({ text, state, onClick, isHebrew }) {
  const base = 'w-full py-4 px-3 rounded-2xl font-bold text-base transition-all duration-200 active:scale-95 border-2 text-center leading-snug'
  const styles = {
    idle:    'bg-white border-gray-200 text-gray-800 hover:border-gray-300 hover:shadow-sm',
    correct: 'bg-green-100 border-green-400 text-green-800 scale-100',
    wrong:   'bg-red-100   border-red-400   text-red-800   scale-100',
    reveal:  'bg-green-100 border-green-400 text-green-800',
  }
  return (
    <button
      type="button"
      onClick={state === 'idle' ? onClick : undefined}
      className={`${base} ${styles[state] || styles.idle}`}
      style={isHebrew ? { fontFamily: "'Noto Serif Hebrew', 'David', serif", fontSize: '1rem' } : {}}
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

      <div className="flex-1 p-5 space-y-4">
        {Object.entries(SUBJECTS).map(([key, sub]) => {
          const sess = childLearning[key]
          const sl = STATUS_LABEL[sess.status] || STATUS_LABEL.available
          const done = sess.status === 'done'
          const stars = sess.starsFirst + (sess.status === 'done' && sess.corrections.length > 0 ? 1 : 0)

          return (
            <button
              key={key}
              type="button"
              onClick={() => !done && onSelect(key)}
              className={[
                'w-full rounded-3xl p-5 flex items-center gap-4 transition-all active:scale-95',
                done ? 'bg-gray-50 opacity-60' : `bg-gradient-to-br ${sub.color} shadow-lg text-white`,
              ].join(' ')}
            >
              <span className="text-4xl">{sub.emoji}</span>
              <div className="flex-1 text-right">
                <p className={`font-black text-xl ${done ? 'text-gray-500' : 'text-white'}`}>{sub.label}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sl.color}`}>{sl.text}</span>
              </div>
              {stars > 0 && (
                <div className="text-right">
                  <p className={`text-2xl font-black ${done ? 'text-amber-500' : 'text-yellow-200'}`}>+{stars}⭐</p>
                </div>
              )}
            </button>
          )
        })}

        <div className="bg-violet-50 rounded-2xl p-4 text-center text-sm text-violet-600 font-semibold mt-2">
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
  const isHebrew = subject === 'hebrew'

  useEffect(() => () => clearTimeout(timerRef.current), [])

  if (!currentQ) return null

  function handleAnswer(idx) {
    if (reveal) return
    const correct = idx === currentQ.correctIndex
    setReveal({ chosen: idx, correct })
    if (correct) sounds.star?.() ?? sounds.coin?.()
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
          <p
            className="text-2xl font-black text-gray-800 leading-snug whitespace-pre-line"
            style={isHebrew ? { fontFamily: "'Noto Serif Hebrew', 'David', serif" } : {}}
          >
            {currentQ.question}
          </p>
        </div>

        {/* Answer grid */}
        <div className="grid grid-cols-2 gap-3">
          {currentQ.options.map((opt, idx) => (
            <AnswerBtn
              key={idx}
              text={opt}
              state={btnState(idx)}
              onClick={() => handleAnswer(idx)}
              isHebrew={isHebrew}
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
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black text-lg shadow-md active:scale-95 transition-transform"
          >
            🔄 תקן טעויות וקבל כוכבים!
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold active:scale-95 transition-transform"
        >
          חזרה
        </button>
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

  function openSubject(subj) {
    setSubject(subj)
    startLearningSession(childId, subj, grade)
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
