import { createContext, useContext, useState, useRef } from 'react'
import { useChildren } from '../hooks/useChildren.js'
import { useChores } from '../hooks/useChores.js'
import { useSettings } from '../hooks/useSettings.js'
import { useTransactions } from '../hooks/useTransactions.js'
import { useSyncEngine } from '../hooks/useSyncEngine.js'
import { useLearning } from '../hooks/useLearning.js'
import { useDailyPenalty } from '../hooks/useDailyPenalty.js'
import { useRecurringAllowance } from '../hooks/useRecurringAllowance.js'
import { useWeeklySummary } from '../hooks/useWeeklySummary.js'
import { clearAll, get } from '../lib/storage.js'
import { checkBadges } from '../lib/badges.js'
import { notifyChore } from '../lib/notifications.js'
import { calculateStreak } from '../lib/utils.js'

const AppContext = createContext(null)

export function AppProvider({ children: reactChildren }) {
  const childrenApi = useChildren()
  const choresApi = useChores()
  const settingsApi = useSettings()
  const transactionsApi = useTransactions()
  const { status: syncStatus } = useSyncEngine(settingsApi.settings.familyCode || '')
  const learningApi = useLearning()
  useDailyPenalty(childrenApi, transactionsApi)
  useRecurringAllowance(childrenApi, transactionsApi)
  useWeeklySummary(childrenApi, transactionsApi)

  const [screen, setScreen] = useState('home')
  const [activeChildId, setActiveChildId] = useState(null)
  const [openModal, setOpenModal] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [pendingBadge,    setPendingBadge]    = useState(null)
  const [pendingFreeSpin, setPendingFreeSpin] = useState(null)
  const [coinInFlight,    setCoinInFlight]    = useState(null) // childId while coin is animating

  function navigate(nextScreen, childId = null) {
    setScreen(nextScreen)
    setActiveChildId(childId)
  }

  function showModal(name, data = null) {
    setOpenModal(name)
    setModalData(data)
  }

  function closeModal() {
    setOpenModal(null)
    setModalData(null)
  }

  function requirePin(onSuccess) {
    if (!settingsApi.settings.pin) {
      onSuccess()
    } else {
      showModal('pin', { onSuccess })
    }
  }

  function resetAllData() {
    clearAll()
    window.location.reload()
  }

  function resetChildData(childId) {
    childrenApi.resetChild(childId)
    transactionsApi.clearTransactions(childId)
  }

  // Wraps addTransaction to check for newly earned badges + free spins afterwards
  function addTransaction(childId, txData) {
    const tx = transactionsApi.addTransaction(childId, txData)
    const child = childrenApi.children.find((c) => c.id === childId)
    if (child) {
      // Project next state (new tx prepended; state hasn't flushed yet)
      const projected = [tx, ...transactionsApi.getTransactions(childId)]
      const newBadges = checkBadges(child, projected)
      newBadges.forEach((badge) => childrenApi.awardBadge(childId, badge))
      if (newBadges.length > 0) setPendingBadge({ ...newBadges[0], childId })

      // Notify on chore
      if (txData.type === 'chore') notifyChore(child.name, txData.description)

      // Free spin + streak bonus
      if (txData.type === 'chore') {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
        const todayChores = projected.filter(
          (t) => t.type === 'chore' && t.timestamp >= dayStart.getTime()
        )

        // Free spin every 5 chores in a day
        if (todayChores.length > 0 && todayChores.length % 5 === 0) {
          childrenApi.grantFreeSpin(childId)
          setPendingFreeSpin({ childId })
        }

        // Streak bonus: check on FIRST chore of the day only
        if (todayChores.length === 1) {
          const streak = calculateStreak(projected)
          const bonus  = child.streakBonus
          if (bonus?.enabled && streak > 0 && streak % (bonus.threshold || 7) === 0) {
            const bonusStars = parseInt(bonus.stars) || 0
            if (bonusStars > 0) {
              childrenApi.addStars(childId, bonusStars)
              transactionsApi.addTransaction(childId, {
                type: 'streak_bonus', amount: bonusStars, currency: 'stars',
                description: `🔥 בונוס רצף ${streak} ימים! +${bonusStars}⭐`,
                timestamp: Date.now(),
              })
            }
            if (bonus.freeSpin) {
              childrenApi.grantFreeSpin(childId)
              setPendingFreeSpin({ childId })
            }
          }
        }
      }
    }
    return tx
  }

  // Wraps deleteTransaction to keep freeSpins in sync.
  // Reads directly from localStorage so it's correct even inside a synchronous loop.
  const DEDUCT_TYPES = ['expense', 'convert_out', 'prize_redeem', 'savings_open', 'penalty', 'wheel_spin', 'loan_repay']
  function deleteTransaction(childId, txId) {
    const allTx = get('all_transactions') || {}
    const txList = allTx[childId] || []
    const tx = txList.find((t) => t.id === txId)

    if (tx) {
      // Reverse balance effect
      const isDeduct = DEDUCT_TYPES.includes(tx.type)
      const delta = isDeduct ? tx.amount : -tx.amount
      if (tx.currency === 'stars') childrenApi.adjustStars(childId, delta)
      else childrenApi.adjustShekels(childId, delta)

      // Revoke a free spin if this chore was the one that crossed a /5 boundary
      if (tx.type === 'chore') {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
        if (tx.timestamp >= dayStart.getTime()) {
          const todayCount = txList.filter(
            (t) => t.type === 'chore' && t.timestamp >= dayStart.getTime()
          ).length
          if (todayCount > 0 && Math.floor(todayCount / 5) > Math.floor((todayCount - 1) / 5)) {
            childrenApi.consumeFreeSpin(childId)
          }
        }
      }
    }

    transactionsApi.deleteTransaction(childId, txId)
  }

  // ── Savings wrappers (log transaction + update child) ──────────────
  function startSavings(childId, { amount }) {
    const saving = childrenApi.openSavings(childId, { amount })
    addTransaction(childId, {
      type: 'savings_open',
      amount,
      currency: 'shekels',
      description: `🏦 חסכון נפתח — 10% ריבית לחודש`,
    })
    return saving
  }

  function finishSavings(childId, savingId, mode) {
    const child = childrenApi.children.find((c) => c.id === childId)
    const saving = (child?.savings || []).find((s) => s.id === savingId)
    if (!saving) return
    const interest = saving.amount * 0.10 * saving.termMonths
    if (mode === 'matured') {
      const total = saving.amount + interest
      childrenApi.closeSavings(childId, savingId, 'matured', total)
      addTransaction(childId, {
        type: 'savings_close',
        amount: total,
        currency: 'shekels',
        description: `💰 חסכון הבשיל! (${saving.termMonths} חודש${saving.termMonths > 1 ? 'ים' : ''}, ריבית: +${Math.round(interest)}₪)`,
      })
    } else {
      // Compound interest for completed months (10% per month, compounded)
      const start = new Date(saving.startDate)
      const now   = new Date()
      let cm = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
      if (now.getDate() < start.getDate()) cm--
      cm = Math.max(0, cm)
      const earlyTotal     = saving.amount * Math.pow(1.10, cm)
      const earnedInterest = earlyTotal - saving.amount
      childrenApi.closeSavings(childId, savingId, 'early', earlyTotal)
      addTransaction(childId, {
        type: 'savings_early',
        amount: earlyTotal,
        currency: 'shekels',
        description: cm > 0
          ? `⚠️ פדיון מוקדם — ${cm} חודש${cm > 1 ? 'ים' : ''} ריבית: +${Math.round(earnedInterest)}₪`
          : `⚠️ פדיון מוקדם — פחות מחודש, ללא ריבית`,
      })
    }
  }

  function doTransferStars(fromId, toId, stars, price) {
    const fromChild = childrenApi.children.find(c => c.id === fromId)
    const toChild   = childrenApi.children.find(c => c.id === toId)
    if (!fromChild || !toChild) return
    childrenApi.transferStars(fromId, toId, stars, price)
    if (price > 0) {
      addTransaction(fromId, { type: 'stars_sold_out',   amount: stars, currency: 'stars', description: `🤝 מכרת ${stars}⭐ ל${toChild.name} ← +${price}₪` })
      addTransaction(toId,   { type: 'stars_bought_in',  amount: stars, currency: 'stars', description: `🤝 קנית ${stars}⭐ מ${fromChild.name} ← -${price}₪` })
    } else {
      addTransaction(fromId, { type: 'stars_transfer_out', amount: stars, currency: 'stars', description: `🎁 שלחת ${stars}⭐ ל${toChild.name}` })
      addTransaction(toId,   { type: 'stars_transfer_in',  amount: stars, currency: 'stars', description: `🎁 קיבלת ${stars}⭐ מ${fromChild.name}` })
    }
  }

  function doTransferMoney(fromId, toId, amount) {
    const fromChild = childrenApi.children.find(c => c.id === fromId)
    const toChild   = childrenApi.children.find(c => c.id === toId)
    if (!fromChild || !toChild) return
    childrenApi.adjustShekels(fromId, -amount)
    childrenApi.adjustShekels(toId,    amount)
    addTransaction(fromId, { type: 'money_transfer_out', amount, currency: 'shekels', description: `💸 שלחת ${amount}₪ ל${toChild.name}` })
    addTransaction(toId,   { type: 'money_transfer_in',  amount, currency: 'shekels', description: `💸 קיבלת ${amount}₪ מ${fromChild.name}` })
  }

  // ── Loan wrappers (update child + log transaction) ────────────────
  function loanMoney(childId, { amount, description }) {
    childrenApi.addLoan(childId, { amount, description })
    addTransaction(childId, {
      type: 'loan',
      amount,
      currency: 'shekels',
      description: `💳 הלוואה${description ? `: ${description}` : ''}`,
    })
  }

  function repayLoan(childId, loanId) {
    const child = childrenApi.children.find((c) => c.id === childId)
    const loan  = (child?.loans || []).find((l) => l.id === loanId)
    if (!loan) return
    childrenApi.repayLoan(childId, loanId)
    addTransaction(childId, {
      type: 'loan_repay',
      amount: loan.amount,
      currency: 'shekels',
      description: `💳 פרעון${loan.description ? `: ${loan.description}` : ''}`,
    })
  }

  function deleteLoan(childId, loanId) {
    childrenApi.deleteLoan(childId, loanId)
  }

  function undoRepayLoan(childId, loanId) {
    childrenApi.undoRepayLoan(childId, loanId)
  }

  const value = {
    ...childrenApi,
    ...choresApi,
    ...settingsApi,
    ...transactionsApi,
    addTransaction,   // override with badge-aware version
    deleteTransaction, // override with balance + freeSpin sync
    startSavings,
    finishSavings,
    doTransferStars,
    doTransferMoney,
    loanMoney,
    repayLoan,        // override childrenApi.repayLoan with tx-logging version
    deleteLoan,
    undoRepayLoan,
    requirePin,
    resetChildData,
    pendingBadge,
    clearPendingBadge: () => setPendingBadge(null),
    pendingFreeSpin,
    clearPendingFreeSpin: () => setPendingFreeSpin(null),
    coinInFlight,
    startCoinFlight: (childId, durationMs) => {
      setCoinInFlight(childId)
      setTimeout(() => setCoinInFlight(null), durationMs)
    },
    getChildLearning:       learningApi.getChildLearning,
    startLearningSession:   learningApi.startSession,
    answerLearningQuestion: learningApi.answerQuestion,
    startLearningCorrection: learningApi.startCorrection,
    syncStatus,
    screen,
    activeChildId,
    navigate,
    openModal,
    modalData,
    showModal,
    closeModal,
    resetAllData,
  }

  return <AppContext.Provider value={value}>{reactChildren}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
