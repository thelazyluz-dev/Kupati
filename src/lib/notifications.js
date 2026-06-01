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
  try { new Notification(title, { body, lang: 'he', dir: 'rtl' }) } catch {}
}

export const notifyChore     = (childName, desc)        => notify(`✅ ${childName}`, desc || 'מטלה הושלמה')
export const notifyPenalty   = (childName, amount, day) => notify(`⚡ קנס — ${childName}`, `-${amount}⭐ (${day})`)
export const notifyAllowance = (childName, amount)      => notify(`💰 קצבה — ${childName}`, `+${amount}₪ הופקדו`)
export const notifyWeeklySummary = (childName, body)    => notify(`📊 סיכום שבועי — ${childName}`, body)
