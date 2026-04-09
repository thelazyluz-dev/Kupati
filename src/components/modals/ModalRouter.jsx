import { useApp } from '../../context/AppContext.jsx'
import AddStarsModal from './AddStarsModal.jsx'
import ConvertStarsModal from './ConvertStarsModal.jsx'
import AddMoneyModal from './AddMoneyModal.jsx'
import ExpenseModal from './ExpenseModal.jsx'
import AddChildModal from './AddChildModal.jsx'
import EditChildModal from './EditChildModal.jsx'
import GoalModal from './GoalModal.jsx'
import PinModal from './PinModal.jsx'
import EditTransactionModal from './EditTransactionModal.jsx'

export default function ModalRouter() {
  const { openModal } = useApp()

  if (!openModal) return null

  const map = {
    addStars: AddStarsModal,
    convertStars: ConvertStarsModal,
    addMoney: AddMoneyModal,
    expense: ExpenseModal,
    addChild: AddChildModal,
    editChild: EditChildModal,
    goal: GoalModal,
    pin: PinModal,
    editTransaction: EditTransactionModal,
  }

  const ModalComponent = map[openModal]
  if (!ModalComponent) return null
  return <ModalComponent />
}
