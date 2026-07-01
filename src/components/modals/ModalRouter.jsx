import { lazy, Suspense } from 'react'
import { useApp } from '../../context/AppContext.jsx'

// All modals are lazy — none of them is needed for first paint, and together
// they are a large share of the bundle. Each becomes its own chunk that loads
// on first open (then stays cached by the service worker).
const map = {
  addStars:        lazy(() => import('./AddStarsModal.jsx')),
  addMoney:        lazy(() => import('./AddMoneyModal.jsx')),
  expense:         lazy(() => import('./ExpenseModal.jsx')),
  addChild:        lazy(() => import('./AddChildModal.jsx')),
  editChild:       lazy(() => import('./EditChildModal.jsx')),
  goal:            lazy(() => import('./GoalModal.jsx')),
  pin:             lazy(() => import('./PinModal.jsx')),
  editTransaction: lazy(() => import('./EditTransactionModal.jsx')),
  redeemPrize:     lazy(() => import('./RedeemPrizeModal.jsx')),
  savings:         lazy(() => import('./SavingsModal.jsx')),
  penalty:         lazy(() => import('./PenaltyModal.jsx')),
  spinWheel:       lazy(() => import('./SpinWheelModal.jsx')),
  parentNote:      lazy(() => import('./ParentNoteModal.jsx')),
  memories:        lazy(() => import('./MemoriesModal.jsx')),
  loan:            lazy(() => import('./LoanModal.jsx')),
  transferStars:   lazy(() => import('./TransferStarsModal.jsx')),
  learning:        lazy(() => import('./LearningModal.jsx')),
  weeklyReport:    lazy(() => import('./WeeklyReportModal.jsx')),
  convertStars:    lazy(() => import('./ConvertStarsModal.jsx')),
}

function ModalSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="text-4xl animate-bounce">🐷</div>
    </div>
  )
}

export default function ModalRouter() {
  const { openModal } = useApp()

  if (!openModal) return null

  const ModalComponent = map[openModal]
  if (!ModalComponent) return null
  return (
    <Suspense fallback={<ModalSpinner />}>
      <ModalComponent />
    </Suspense>
  )
}
