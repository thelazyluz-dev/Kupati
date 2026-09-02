function getNotifyPref(key) {
  try {
    const s = JSON.parse(localStorage.getItem('kupati_settings') || '{}')
    const n = s.notify ?? {}
    return n[key] !== false // default: true
  } catch { return true }
}

export function getPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

const NOTIF_OPTIONS = { lang: 'he', dir: 'rtl', icon: '/icon-192.png' }

// Use Service Worker showNotification when available (required for PWA/iOS),
// fall back to new Notification() for plain browser context.
async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const opts = { ...NOTIF_OPTIONS, body }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, opts)
        return
      }
    }
    new Notification(title, opts)
  } catch {}
}

function notifyIfEnabled(key, title, body) {
  if (!getNotifyPref(key)) return
  notify(title, body)
}

// Parent-side notifications
export const notifyChore = (childName, desc) =>
  notifyIfEnabled('choreCompleted', `✅ ${childName}`, desc || 'מטלה הושלמה')

export const notifyChoreRequest = (childName, choreName) =>
  notifyIfEnabled('choreRequest', `📝 בקשת מטלה — ${childName}`, choreName)

export const notifyPrizeRequest = (childName, prizeName) =>
  notifyIfEnabled('choreRequest', `🎁 בקשת פרס — ${childName}`, prizeName)

// Generic request notification (any request type). `title` is the type's
// notify label (e.g. "⭐ בקשת כוכבים"); body carries the request details.
export const notifyRequest = (childName, title, body) =>
  notifyIfEnabled('choreRequest', `${title} — ${childName}`, body)

export const notifyMoneyAdded = (childName, amount) =>
  notifyIfEnabled('moneyAdded', `💵 הפקדה — ${childName}`, `+${amount}₪ הופקדו`)

export const notifyPenalty = (childName, amount, day, currency = 'stars') =>
  notifyIfEnabled('penalty', `⚡ קנס — ${childName}`, `-${amount}${currency === 'shekels' ? '₪' : '⭐'}${day ? ` (${day})` : ''}`)

export const notifyAllowance = (childName, amount) =>
  notifyIfEnabled('allowance', `💰 קצבה — ${childName}`, `+${amount}₪ הופקדו`)

export const notifyWeeklySummary = (childName, body) =>
  notifyIfEnabled('weeklySummary', `📊 סיכום שבועי — ${childName}`, body)

// Child-mode notifications (always shown if permission granted)
export const notifyChoreApproved = (choreName, stars) =>
  notify(`✅ מטלה אושרה!`, `${choreName} — +${stars}⭐`)

export const notifyChoreRejected = (choreName) =>
  notify(`❌ מטלה לא אושרה`, choreName)

// Generic child-side decision notification for any request type.
export const notifyRequestApproved = (title) =>
  notify(`✅ אושר!`, title)

export const notifyRequestRejected = (title, reason) =>
  notify(`❌ לא אושר`, reason ? `${title} — ${reason}` : title)

export const notifyChoreSubmitted = (childName, count, firstChoreName) => {
  const body = count > 1
    ? `${count} מטלות ממתינות לאישור הורה`
    : `${firstChoreName} — ממתין לאישור הורה`
  notify(`📝 ${childName} ביצע מטלה`, body)
}
