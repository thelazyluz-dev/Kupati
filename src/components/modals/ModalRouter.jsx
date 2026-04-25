import { useApp } from '../../context/AppContext.jsx'
import AddStarsModal from './AddStarsModal.jsx'
import AddMoneyModal from './AddMoneyModal.jsx'
import ExpenseModal from './ExpenseModal.jsx'
import AddChildModal from './AddChildModal.jsx'
import EditChildModal from './EditChildModal.jsx'
import GoalModal from './GoalModal.jsx'
import PinModal from './PinModal.jsx'
import EditTransactionModal from './EditTransactionModal.jsx'
import RedeemPrizeModal from './RedeemPrizeModal.jsx'
import SavingsModal from './SavingsModal.jsx'
import PenaltyModal from './PenaltyModal.jsx'
import SpinWheelModal from './SpinWheelModal.jsx'
import ParentNoteModal from './ParentNoteModal.jsx'
import MemoriesModal from './MemoriesModal.jsx'

export default function ModalRouter() {
  const { openModal } = useApp()

  if (!openModal) return null

  const map = {
    addStars: AddStarsModal,
    addMoney: AddMoneyModal,
    expense: ExpenseModal,
    addChild: AddChildModal,
    editChild: EditChildModal,
    goal: GoalModal,
    pin: PinModal,
    editTransaction: EditTransactionModal,
    redeemPrize: RedeemPrizeModal,
    savings: SavingsModal,
    penalty: PenaltyModal,
    spinWheel: SpinWheelModal,
    parentNote: ParentNoteModal,
    memories: MemoriesModal,
  }

  const ModalComponent = map[openModal]
  if (!ModalComponent) return null
  return <ModalComponent />
}
