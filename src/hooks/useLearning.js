import { useState } from 'react'
import { generateMathQuestions } from '../lib/learning/mathQuestions.js'
import { getHebrewQuestions } from '../lib/learning/hebrewQuestions.js'

const KEY = 'kupati_learning'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function emptySession() {
  return {
    status: 'available',     // available | in_progress | needs_correction | done
    questions: [],
    answers: [],             // true=correct | false=wrong | null=unanswered
    progress: 0,             // next question index (0–4)
    corrections: [],         // indices of wrong questions from first session
    correctionProgress: 0,   // next correction index
    starsFirst: 0,           // correct answers in first session
    phase: 'first',          // 'first' | 'correction'
  }
}

function freshChildState() {
  return { date: todayStr(), math: emptySession(), hebrew: emptySession() }
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function resolveChild(all, childId) {
  const cs = all[childId]
  return (!cs || cs.date !== todayStr()) ? freshChildState() : cs
}

export function useLearning() {
  const [all, setAll] = useState(load)

  function commit(updater) {
    setAll(prev => {
      const next = updater(prev)
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function getChildLearning(childId) {
    return resolveChild(all, childId)
  }

  function startSession(childId, subject, grade) {
    commit(prev => {
      const cs = resolveChild(prev, childId)
      const sess = cs[subject]

      // If starting fresh (available or no questions), generate new ones
      if (sess.status === 'available' || sess.questions.length === 0) {
        const questions = subject === 'math'
          ? generateMathQuestions(grade, 5)
          : getHebrewQuestions(grade, 5)
        return {
          ...prev,
          [childId]: {
            ...cs,
            [subject]: { ...emptySession(), status: 'in_progress', questions, answers: Array(5).fill(null) },
          },
        }
      }

      // Resume in_progress or start correction
      return {
        ...prev,
        [childId]: { ...cs, [subject]: { ...sess, status: 'in_progress' } },
      }
    })
  }

  function answerQuestion(childId, subject, isCorrect) {
    commit(prev => {
      const cs = resolveChild(prev, childId)
      const sess = { ...cs[subject] }

      if (sess.phase === 'first') {
        const idx = sess.progress
        const answers = [...sess.answers]
        answers[idx] = isCorrect
        const corrections = isCorrect ? sess.corrections : [...sess.corrections, idx]
        const progress = idx + 1
        const finished = progress >= sess.questions.length

        return {
          ...prev,
          [childId]: {
            ...cs,
            [subject]: {
              ...sess,
              answers,
              corrections,
              progress,
              starsFirst: finished ? answers.filter(Boolean).length : sess.starsFirst,
              status: finished
                ? corrections.length > 0 ? 'needs_correction' : 'done'
                : 'in_progress',
            },
          },
        }
      }

      // Correction phase
      const correctionProgress = sess.correctionProgress + 1
      const finished = correctionProgress >= sess.corrections.length
      return {
        ...prev,
        [childId]: {
          ...cs,
          [subject]: {
            ...sess,
            correctionProgress,
            status: finished ? 'done' : 'in_progress',
          },
        },
      }
    })
  }

  function startCorrection(childId, subject) {
    commit(prev => {
      const cs = resolveChild(prev, childId)
      return {
        ...prev,
        [childId]: {
          ...cs,
          [subject]: { ...cs[subject], phase: 'correction', correctionProgress: 0, status: 'in_progress' },
        },
      }
    })
  }

  return { getChildLearning, startSession, answerQuestion, startCorrection }
}
