import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { useChildren } from '../hooks/useChildren.js'
import { useChores } from '../hooks/useChores.js'
import { useSettings } from '../hooks/useSettings.js'
import { useTransactions } from '../hooks/useTransactions.js'
import { useSyncEngine } from '../hooks/useSyncEngine.js'
import { useLearning } from '../hooks/useLearning.js'
import { useDailyPenalty } from '../hooks/useDailyPenalty.js'
import { useRecurringAllowance } from '../hooks/useRecurringAllowance.js'
import { useWeeklySummary } from '../hooks/useWeeklySummary.js'
import { usePendingChores } from '../hooks/usePendingChores.js'
import { clearAll, get, set } from '../lib/storage.js'
import { checkBadges } from '../lib/badges.js'
import { notifyChore, notifyRequest } from '../lib/notifications.js'
import { calculateStreak, generateId, DEDUCT_TX_TYPES } from '../lib/utils.js'
import { describeRequest, isActionable, applyApproval } from '../lib/requests.js'
import { makePinSettings } from '../lib/pin.js'

const AppContext = createContext(null)

export function AppProvider({ children: reactChildren }) {
  const childrenApi = useChildren()
  const choresApi = useChores()
  const settingsApi = useSettings()
  const transactionsApi = useTransactions()
  const { status: syncStatus } = useSyncEngine(settingsApi.settings.familyCode || '')
  const learningApi = useLearning()
  const pendingChoresApi = usePendingChores()
  useDailyPenalty(childrenApi, transactionsApi, syncStatus, !!settingsApi.settings.familyCode)
  useRecurringAllowance(childrenApi, transactionsApi)
  useWeeklySummary(childrenApi, transactionsApi)

  const [childActivity, setChildActivity] = useState(() => get('childActivity') ?? [])
  const [activityViewed, setActivityViewed] = useState(
    () => parseInt(localStorage.getItem('kupati_activityViewed') || '0', 10)
  )
  useEffect(() => {
    function onSync(e) {
      if (e.detail?.key === 'childActivity') setChildActivity(get('childActivity') ?? [])
    }
    window.addEventListener('kupati-storage', onSync)
    return () => window.removeEventListener('kupati-storage', onSync)
  }, [])
  function markChildActivityRead() {
    const now = Date.now()
    localStorage.setItem('kupati_activityViewed', String(now))
    setActivityViewed(now)
  }

  // Ensure the parent PIN reaches the child tablet as a hash so the child-mode
  // exit lock can work. Two cases handled once on mount:
  //  - legacy plaintext `pin` (pre-hash) → upgrade to a salted hash
  //  - already-hashed pin whose family settings doc predates the sync change →
  //    re-save once to push pinHash/pinSalt up to Firestore for the tablet
  useEffect(() => {
    const s = settingsApi.settings
    if (s.pin && !s.pinHash) {
      makePinSettings(s.pin).then((patch) => settingsApi.updateSettings(patch)).catch(() => {})
    } else if (s.pinHash && !localStorage.getItem('kupati_pinSynced_v1')) {
      settingsApi.updateSettings({})   // no-op merge → triggers a settings push
      localStorage.setItem('kupati_pinSynced_v1', '1')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const unreadActivityCount = childActivity.filter((e) => e.timestamp > activityViewed).length

  function logActivity(childId, childName, type, description, amount, currency) {
    const entry = {
      id: generateId(),
      childId, childName, type, description,
      amount: amount || 0,
      currency: currency || 'stars',
      source: 'parent',
      timestamp: Date.now(),
    }
    const current = get('childActivity') ?? []
    const next = [entry, ...current].slice(0, 200)
    set('childActivity', next)
    setChildActivity(next)
    window.dispatchEvent(new CustomEvent('kupati-storage', { detail: { key: 'childActivity' } }))
  }

  const [screen, setScreen] = useState('home')
  const [activeChildId, setActiveChildId] = useState(null)
  const [openModal, setOpenModal] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [pendingBadge,    setPendingBadge]    = useState(null)
  const [pendingFreeSpin, setPendingFreeSpin] = useState(null)
  const [coinInFlight,    setCoinInFlight]    = useState(null) // childId while coin is animating
  // Tracks today's chore count per child synchronously (React state is stale inside a batch loop)
  const todayChoreCountRef = useRef({})

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
    if (!settingsApi.settings.pin && !settingsApi.settings.pinHash) {
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

  function recalculateBalance(childId) {
    const txs = transactionsApi.getTransactions(childId)
    childrenApi.recalculateBalance(childId, txs)
  }

  const PARENT_LOG_MAP = {
    chore:              (d) => d.currency === 'stars' ? 'parent_stars_add' : 'parent_money_add',
    other:              (d) => d.currency === 'stars' ? 'parent_stars_add' : 'parent_money_add',
    gift:               ()  => 'parent_money_add',
    expense:            ()  => 'expense',
    penalty:            ()  => 'penalty',
    prize_redeem:       ()  => 'prize_redeem',
    wheel_spin:         ()  => 'wheel_spin',
    wheel_win:          ()  => 'wheel_win',
    savings_open:       ()  => 'savings_open',
    savings_close:      ()  => 'savings_close',
    savings_early:      ()  => 'savings_early',
    stars_transfer_out: ()  => 'transfer_out',
    money_transfer_out: ()  => 'transfer_out',
    stars_sold_out:     ()  => 'transfer_out',
    loan:               ()  => 'loan',
    loan_repay:         ()  => 'loan_repay',
  }

  // Wraps addTransaction to check for newly earned badges + free spins afterwards
  function addTransaction(childId, txData) {
    const { _skipLog, ...cleanTxData } = txData
    const tx = transactionsApi.addTransaction(childId, cleanTxData)
    const child = childrenApi.children.find((c) => c.id === childId)
    if (child) {
      // Project next state (new tx prepended; state hasn't flushed yet)
      const projected = [tx, ...transactionsApi.getTransactions(childId)]
      const newBadges = checkBadges(child, projected)
      newBadges.forEach((badge) => childrenApi.awardBadge(childId, badge))
      if (newBadges.length > 0) setPendingBadge({ ...newBadges[0], childId })

      // Notify on chore
      if (txData.type === 'chore') notifyChore(child.name, txData.description)

      // Free spin + streak bonus — only for chores actually done TODAY.
      // An approved chore request carries the ORIGINAL submit timestamp, which
      // may be a previous day; counting it toward today's tally over-granted
      // free spins (and the revoke path wouldn't undo them).
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
      if (txData.type === 'chore' && (tx.timestamp ?? Date.now()) >= dayStart.getTime()) {
        const todayStr  = dayStart.toDateString()

        // Use a ref so the count is correct even when addTransaction is called
        // multiple times synchronously (React state is stale between batch calls)
        const cached = todayChoreCountRef.current[childId]
        if (!cached || cached.dateStr !== todayStr) {
          const base = transactionsApi.getTransactions(childId).filter(
            (t) => t.type === 'chore' && t.timestamp >= dayStart.getTime()
          ).length
          todayChoreCountRef.current[childId] = { dateStr: todayStr, count: base }
        }
        todayChoreCountRef.current[childId].count++
        const todayCount = todayChoreCountRef.current[childId].count

        // Free spin every 5 chores in a day
        if (todayCount % 5 === 0) {
          childrenApi.grantFreeSpin(childId)
          setPendingFreeSpin({ childId })
        }

        // Streak bonus: check on FIRST chore of the day only
        if (todayCount === 1) {
          const streak = calculateStreak(projected)  // projected is fine here — single call per day
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

      // Log to activity feed for parent-initiated actions
      const actTypeResolver = PARENT_LOG_MAP[cleanTxData.type]
      if (!_skipLog && child && actTypeResolver) {
        const actType = actTypeResolver(cleanTxData)
        logActivity(childId, child.name, actType, cleanTxData.description, cleanTxData.amount, cleanTxData.currency)
      }
    }
    return tx
  }

  // Wraps deleteTransaction to keep freeSpins in sync.
  // Reads directly from localStorage so it's correct even inside a synchronous loop.
  function deleteTransaction(childId, txId) {
    const allTx = get('all_transactions') || {}
    const txList = allTx[childId] || []
    const tx = txList.find((t) => t.id === txId)

    if (tx) {
      // Reverse balance effect — single source of truth for debit types.
      const isDeduct = DEDUCT_TX_TYPES.has(tx.type)
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

    // One interest model for every path: 10% per completed month, compounded.
    // (Savings have no fixed term — the old 'matured' branch referenced a
    // non-existent termMonths field and produced NaN.)
    const start = new Date(saving.startDate)
    const now   = new Date()
    let cm = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    if (now.getDate() < start.getDate()) cm--
    cm = Math.max(0, cm)
    const total    = Math.round(saving.amount * Math.pow(1.10, cm) * 100) / 100
    const interest = Math.round((total - saving.amount) * 100) / 100
    const monthsLabel = `${cm} חודש${cm > 1 ? 'ים' : ''}`

    if (mode === 'matured') {
      childrenApi.closeSavings(childId, savingId, 'matured', total)
      addTransaction(childId, {
        type: 'savings_close',
        amount: total,
        currency: 'shekels',
        description: `💰 חסכון הבשיל! (${monthsLabel}, ריבית: +${Math.round(interest)}₪)`,
      })
    } else {
      childrenApi.closeSavings(childId, savingId, 'early', total)
      addTransaction(childId, {
        type: 'savings_early',
        amount: total,
        currency: 'shekels',
        description: cm > 0
          ? `⚠️ פדיון מוקדם — ${monthsLabel} ריבית: +${Math.round(interest)}₪`
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

  // Notify parent when a new chore request arrives (via Firestore sync)
  const prevPendingRef = useRef(null)
  useEffect(() => {
    const notifyIncomingRequest = (pc) => {
      const child = childrenApi.children.find((c) => c.id === pc.childId)
      const name = child?.name || pc.childName || ''
      if (!name) return
      const d = describeRequest(pc)
      const body = [d.title, d.amount, pc.note].filter(Boolean).join(' · ')
      notifyRequest(name, d.notifyTitle, body)
    }
    const current = pendingChoresApi.pendingChores
    if (prevPendingRef.current === null) {
      // First mount — notify about pending chores submitted in the last 10 min
      // that weren't notified yet (tracked by timestamp in localStorage).
      const lastNotified = parseInt(localStorage.getItem('kupati_lastNotified') || '0', 10)
      const tenMinAgo = Date.now() - 10 * 60 * 1000
      const cutoff = Math.max(lastNotified, tenMinAgo)
      const missed = current.filter(
        (pc) => isActionable(pc) && pc.timestamp > cutoff
      )
      if (missed.length > 0) {
        missed.forEach((pc) => notifyIncomingRequest(pc))
        localStorage.setItem('kupati_lastNotified', String(Date.now()))
      }
      prevPendingRef.current = current
      return
    }
    const prev = prevPendingRef.current
    // Notify on requests that just became actionable (new pending, or a
    // parent-assigned chore the child just marked done).
    const newReqs = current.filter(
      (pc) => isActionable(pc) && !prev.find((p) => p.id === pc.id && p.status === pc.status)
    )
    if (newReqs.length > 0) {
      newReqs.forEach((pc) => notifyIncomingRequest(pc))
      localStorage.setItem('kupati_lastNotified', String(Date.now()))
    }
    prevPendingRef.current = current
  }, [pendingChoresApi.pendingChores]) // eslint-disable-line

  function addAssignedChore(childId, { choreId, choreName, choreEmoji, amount, currency = 'stars' }) {
    const child = childrenApi.children.find((c) => c.id === childId)
    logActivity(childId, child?.name || '', 'chore_assign',
      `${choreEmoji || '📋'} ${choreName}`, amount, currency)
    return pendingChoresApi.addPendingChore({ childId, choreId, choreName, choreEmoji, amount, currency, source: 'parent' })
  }

  // ── Unified request approval ────────────────────────────────────────────
  // Applies the balance/data effect for ANY request type, then marks it
  // approved. `opts.amount` lets the parent approve a different amount than
  // requested ("approve with edit"). Chore/prize keep their exact old behaviour.
  function approveRequest(reqId, opts = {}) {
    const req = pendingChoresApi.pendingChores.find((pc) => pc.id === reqId)
    if (!req) return
    // Terminal, or a parent-assigned chore the child hasn't marked done yet
    if (req.status === 'approved' || req.status === 'rejected' || req.status === 'assigned') return

    // Spend requests can't take more than the child currently has (their balance
    // may have dropped since they asked, or the parent edited the amount up).
    // Clamp so the balance change and the logged transaction always agree —
    // otherwise adjust* floors at 0 while the tx logs the full amount, and a
    // later recalculateBalance diverges.
    const type = req.type || 'chore'
    if (type === 'convert' || type === 'prize' || type === 'purchase') {
      const c = childrenApi.children.find((x) => x.id === req.childId)
      const avail = (type === 'purchase' ? c?.shekelBalance : c?.starBalance) ?? 0
      const want = opts.amount != null ? opts.amount : req.amount
      opts = { ...opts, amount: Math.max(0, Math.min(want, avail)) }
    }

    applyApproval(req, {
      addStars:        childrenApi.addStars,
      adjustStars:     childrenApi.adjustStars,
      adjustShekels:   childrenApi.adjustShekels,
      addTransaction,
      convertStars:    childrenApi.convertStars,
      addGoal:         childrenApi.addGoal,
      updateGoal:      childrenApi.updateGoal,
      updateChild:     childrenApi.updateChild,
      startSavings,
      finishSavings,
      doTransferStars,
      doTransferMoney,
      settings:        settingsApi.settings,
    }, opts)

    // The resolved request itself shows in history — no separate activity entry.
    pendingChoresApi.setPendingChoreStatus(reqId, 'approved', { decidedAt: Date.now() })
  }

  function rejectRequest(reqId, reason = '') {
    const req = pendingChoresApi.pendingChores.find((pc) => pc.id === reqId)
    if (!req) return
    // Only pending/done/assigned requests can be rejected — never touch an
    // already-approved one (which would leave the balance change in place).
    if (req.status === 'approved' || req.status === 'rejected') return
    pendingChoresApi.setPendingChoreStatus(reqId, 'rejected', { decidedAt: Date.now(), parentNote: reason })
  }

  // Backward-compatible aliases (used by ChildActivityLog / ChildDashboard)
  const approvePendingChore = (id) => approveRequest(id)
  const approvePendingPrize = (id) => approveRequest(id)
  const rejectPendingChore  = (id) => rejectRequest(id)
  const rejectPendingPrize  = (id) => rejectRequest(id)

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
    recalculateBalance,
    pendingBadge,
    clearPendingBadge: () => setPendingBadge(null),
    pendingFreeSpin,
    clearPendingFreeSpin: () => setPendingFreeSpin(null),
    coinInFlight,
    startCoinFlight: (childId, durationMs) => {
      setCoinInFlight(childId)
      setTimeout(() => setCoinInFlight(null), durationMs)
    },
    pendingChores: pendingChoresApi.pendingChores,
    addAssignedChore,
    approveRequest,
    rejectRequest,
    approvePendingChore,
    rejectPendingChore,
    approvePendingPrize,
    rejectPendingPrize,
    getChildLearning:       learningApi.getChildLearning,
    startLearningSession:   learningApi.startSession,
    answerLearningQuestion: learningApi.answerQuestion,
    startLearningCorrection: learningApi.startCorrection,
    childActivity,
    unreadActivityCount,
    markChildActivityRead,
    logActivity,
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
