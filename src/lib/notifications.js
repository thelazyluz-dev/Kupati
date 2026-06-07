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

function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      lang: 'he',
      dir: 'rtl',
      icon: '/icon-192.png',
    })
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

export const notifyMoneyAdded = (childName, amount) =>
  notifyIfEnabled('moneyAdded', `💵 הפקדה — ${childName}`, `+${amount}₪ הופקדו`)

export const notifyPenalty = (childName, amount, day) =>
  notifyIfEnabled('penalty', `⚡ קנס — ${childName}`, `-${amount}⭐ (${day})`)

export const notifyAllowance = (childName, amount) =>
  notifyIfEnabled('allowance', `💰 קצבה — ${childName}`, `+${amount}₪ הופקדו`)

export const notifyWeeklySummary = (childName, body) =>
  notifyIfEnabled('weeklySummary', `📊 סיכום שבועי — ${childName}`, body)

// Child-mode notifications (always shown if permission granted)
export const notifyChoreApproved = (choreName, stars) =>
  notify(`✅ מטלה אושרה!`, `${choreName} — +${stars}⭐`)

export const notifyChoreRejected = (choreName) =>
  notify(`❌ מטלה לא אושרה`, choreName)
