// Unified request/approval model.
//
// Every child-initiated action that needs a parent's OK becomes a "request"
// object living in the same `pendingChores` array that already carries chore &
// prize requests (so it rides the existing childSync push + syncEngine merge).
//
// This module holds only the PURE, testable parts: the type table, request
// builders, a display formatter, and a pruning helper. The imperative effect
// of *approving* a request (moving balances) lives in AppContext.approveRequest,
// where all the balance functions are in scope.

import { formatNumber, generateId } from './utils.js'

// dir: how the approved amount moves the child's balance —
//   'credit'  = balance goes up (child receives)
//   'debit'   = balance goes down (child spends)
//   'special' = custom effect (convert/transfer/savings)
//   'none'    = no balance change (goal/profile/free-text)
export const REQUEST_TYPES = {
  chore:            { emoji: '✅',  label: 'מטלה',          dir: 'credit',  currency: 'stars',   notify: '📝 בקשת מטלה' },
  prize:            { emoji: '🎁',  label: 'פרס',           dir: 'debit',   currency: 'stars',   notify: '🎁 בקשת פרס' },
  stars:            { emoji: '⭐',  label: 'בקשת כוכבים',   dir: 'credit',  currency: 'stars',   notify: '⭐ בקשת כוכבים' },
  money:            { emoji: '💝',  label: 'בקשת הפקדה',    dir: 'credit',  currency: 'shekels', notify: '💝 בקשת הפקדה' },
  purchase:         { emoji: '🛍️',  label: 'קנייה',         dir: 'debit',   currency: 'shekels', notify: '🛍️ בקשת קנייה' },
  convert:          { emoji: '💱',  label: 'המרה לכסף',     dir: 'special', currency: 'stars',   notify: '💱 בקשת המרה' },
  goal:             { emoji: '🎯',  label: 'מטרה',          dir: 'none',    currency: null,      notify: '🎯 בקשת מטרה' },
  transfer:         { emoji: '🔄',  label: 'העברה',         dir: 'special', currency: 'stars',   notify: '🔄 בקשת העברה' },
  savings_open:     { emoji: '🏦',  label: 'פתיחת חיסכון',  dir: 'special', currency: 'shekels', notify: '🏦 בקשת חיסכון' },
  savings_withdraw: { emoji: '🏦',  label: 'משיכת חיסכון',  dir: 'special', currency: 'shekels', notify: '🏦 בקשת משיכה' },
  profile:          { emoji: '🎨',  label: 'שינוי פרופיל',  dir: 'none',    currency: null,      notify: '🎨 בקשת שינוי' },
  free:             { emoji: '💬',  label: 'בקשה חופשית',   dir: 'none',    currency: null,      notify: '💬 בקשה חדשה' },
}

const RESOLVED = new Set(['approved', 'rejected'])
export function isResolved(req)   { return RESOLVED.has(req.status) }
export function isActionable(req) {
  // Items the parent still needs to act on
  return req.status === 'pending' || (req.source === 'parent' && req.status === 'done')
}

/**
 * Create a child-initiated request. `now` is injectable for tests.
 * Extra type-specific data goes in `meta` (e.g. goal fields, transfer target).
 */
export function newRequest({ type, childId, childName, title, emoji, amount, currency, note, meta }, now = Date.now()) {
  const t = REQUEST_TYPES[type] || REQUEST_TYPES.free
  return {
    id: generateId(),
    childId,
    childName: childName || '',
    type,
    status: 'pending',
    source: 'child',
    timestamp: now,
    amount: amount != null ? amount : null,
    currency: currency || t.currency || null,
    title: title || t.label,
    emoji: emoji || t.emoji,
    note: note || '',
    meta: meta || {},
  }
}

/** Human-readable amount line for a request card, e.g. "+10⭐" / "-5₪" / "10⭐ → ₪". */
export function amountText(req) {
  const t = REQUEST_TYPES[req.type] || {}
  const n = req.amount
  if (n == null) return ''
  const unit = req.currency === 'shekels' ? '₪' : '⭐'
  if (req.type === 'convert')  return `${formatNumber(n)}⭐ → ₪`
  if (req.type === 'transfer') return `${formatNumber(n)}${unit}${req.meta?.toName ? ` → ${req.meta.toName}` : ''}`
  if (t.dir === 'credit')  return `+${formatNumber(n)}${unit}`
  if (t.dir === 'debit')   return `-${formatNumber(n)}${unit}`
  return `${formatNumber(n)}${unit}`
}

/** Everything a request card needs to render, in one place. */
export function describeRequest(req) {
  const t = REQUEST_TYPES[req.type] || REQUEST_TYPES.free
  return {
    emoji: req.emoji || t.emoji,
    typeLabel: t.label,
    title: req.title || t.label,
    amount: amountText(req),
    note: req.note || '',
    notifyTitle: t.notify,
  }
}

/**
 * Keep the pendingChores array from growing forever.
 * NEVER drops active items (pending/assigned/done) — only resolved ones that
 * are old or beyond a cap, so nothing awaiting action is ever lost.
 */
export function prunePendingChores(list, { now = Date.now(), maxAgeMs = 14 * 86400000, maxResolved = 40 } = {}) {
  if (!Array.isArray(list)) return []
  const active = []
  const resolved = []
  for (const r of list) {
    if (isResolved(r)) resolved.push(r)
    else active.push(r)
  }
  const keptResolved = resolved
    .filter((r) => now - (r.decidedAt || r.timestamp || 0) <= maxAgeMs)
    .sort((a, b) => (b.decidedAt || b.timestamp || 0) - (a.decidedAt || a.timestamp || 0))
    .slice(0, maxResolved)
  return [...active, ...keptResolved]
}

/**
 * Apply the balance/data effect of APPROVING a request. Pure w.r.t. this module
 * — all mutations go through the injected `api` callbacks, which makes the
 * type→effect mapping fully unit-testable. Called ONLY on approval; rejection
 * never touches balances.
 *
 * api: { addStars, adjustStars, adjustShekels, addTransaction, convertStars,
 *        addGoal, updateGoal, updateChild, startSavings, finishSavings,
 *        doTransferStars, doTransferMoney, settings }
 * opts: { amount?, rewardStars?, rewardShekels? }
 */
export function applyApproval(req, api, opts = {}) {
  const type   = req.type || 'chore'
  const cid    = req.childId
  const amount = opts.amount != null ? opts.amount : req.amount
  const label  = req.title || `${req.choreEmoji || ''} ${req.choreName || ''}`.trim() || REQUEST_TYPES[type]?.label || ''

  switch (type) {
    case 'chore':
      api.addStars(cid, amount)
      api.addTransaction(cid, { type: 'chore', amount, currency: req.currency || 'stars',
        description: `${req.choreEmoji || '✅'} ${req.choreName || label} (אושר)`, timestamp: req.timestamp, _skipLog: true })
      break
    case 'prize':
      api.adjustStars(cid, -amount)
      api.addTransaction(cid, { type: 'prize_redeem', amount, currency: 'stars',
        description: `${req.emoji || req.choreEmoji || '🎁'} ${req.choreName || label}`, _skipLog: true })
      break
    case 'stars':
      api.addStars(cid, amount)
      api.addTransaction(cid, { type: 'other', amount, currency: 'stars', description: `⭐ ${label || 'כוכבים'}` })
      break
    case 'money':
      api.adjustShekels(cid, amount)
      api.addTransaction(cid, { type: 'other', amount, currency: 'shekels', description: `💝 ${label || 'הפקדה'}` })
      break
    case 'purchase':
      api.adjustShekels(cid, -amount)
      api.addTransaction(cid, { type: 'expense', amount, currency: 'shekels', description: `🛍️ ${label || 'קנייה'}` })
      break
    case 'convert': {
      if (!(amount > 0)) break   // nothing to convert (clamped to 0)
      const converted = api.convertStars(cid, amount, api.settings)
      const desc = `💱 המרת ${amount}⭐ ← ${converted}₪`
      api.addTransaction(cid, { type: 'convert_out', amount, currency: 'stars', description: desc, _skipLog: true })
      api.addTransaction(cid, { type: 'convert_in', amount: converted, currency: 'shekels', description: desc, _skipLog: true })
      break
    }
    case 'goal': {
      const m = req.meta || {}
      if (m.goalId) api.updateGoal(cid, m.goalId, { name: m.name, emoji: m.emoji, targetAmount: m.targetAmount })
      else api.addGoal(cid, { name: m.name, emoji: m.emoji, targetAmount: m.targetAmount, goalImage: m.goalImage })
      break
    }
    case 'transfer': {
      const m = req.meta || {}
      if ((req.currency || 'stars') === 'stars') api.doTransferStars(cid, m.toChildId, amount, m.price || 0)
      else api.doTransferMoney(cid, m.toChildId, amount)
      break
    }
    case 'savings_open':
      api.startSavings(cid, { amount })
      break
    case 'savings_withdraw': {
      const m = req.meta || {}
      api.finishSavings(cid, m.savingId, m.mode || 'normal')
      break
    }
    case 'profile':
      api.updateChild(cid, (req.meta && req.meta.changes) || {})
      break
    case 'free':
      if (opts.rewardStars > 0) {
        api.addStars(cid, opts.rewardStars)
        api.addTransaction(cid, { type: 'other', amount: opts.rewardStars, currency: 'stars', description: `⭐ ${label}` })
      }
      if (opts.rewardShekels > 0) {
        api.adjustShekels(cid, opts.rewardShekels)
        api.addTransaction(cid, { type: 'other', amount: opts.rewardShekels, currency: 'shekels', description: `💝 ${label}` })
      }
      break
    default:
      break
  }
}
