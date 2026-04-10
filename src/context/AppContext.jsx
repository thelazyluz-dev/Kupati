import { createContext, useContext, useState } from 'react'
import { useChildren } from '../hooks/useChildren.js'
import { useChores } from '../hooks/useChores.js'
import { useSettings } from '../hooks/useSettings.js'
import { useTransactions } from '../hooks/useTransactions.js'
import { clearAll } from '../lib/storage.js'
import { checkBadges } from '../lib/badges.js'

const AppContext = createContext(null)

export function AppProvider({ children: reactChildren }) {
  const childrenApi = useChildren()
  const choresApi = useChores()
  const settingsApi = useSettings()
  const transactionsApi = useTransactions()

  const [screen, setScreen] = useState('home')
  const [activeChildId, setActiveChildId] = useState(null)
  const [openModal, setOpenModal] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [pendingBadge, setPendingBadge] = useState(null)

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

  // Wraps addTransaction to check for newly earned badges afterwards
  function addTransaction(childId, txData) {
    const tx = transactionsApi.addTransaction(childId, txData)
    const child = childrenApi.children.find((c) => c.id === childId)
    if (child) {
      // Project next state (new tx prepended; state hasn't flushed yet)
      const projected = [tx, ...transactionsApi.getTransactions(childId)]
      const newBadges = checkBadges(child, projected)
      newBadges.forEach((badge) => childrenApi.awardBadge(childId, badge))
      if (newBadges.length > 0) setPendingBadge({ ...newBadges[0], childId })
    }
    return tx
  }

  const value = {
    ...childrenApi,
    ...choresApi,
    ...settingsApi,
    ...transactionsApi,
    addTransaction,   // override with badge-aware version
    requirePin,
    resetChildData,
    pendingBadge,
    clearPendingBadge: () => setPendingBadge(null),
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
