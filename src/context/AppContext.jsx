import { createContext, useContext, useState } from 'react'
import { useChildren } from '../hooks/useChildren.js'
import { useChores } from '../hooks/useChores.js'
import { useSettings } from '../hooks/useSettings.js'
import { clearAll } from '../lib/storage.js'
import { DEFAULT_CHORES, DEFAULT_SETTINGS } from '../lib/defaults.js'

const AppContext = createContext(null)

export function AppProvider({ children: reactChildren }) {
  // Domain state
  const childrenApi = useChildren()
  const choresApi = useChores()
  const settingsApi = useSettings()

  // Navigation: 'home' | 'dashboard' | 'settings'
  const [screen, setScreen] = useState('home')
  const [activeChildId, setActiveChildId] = useState(null)

  // Modal state
  const [openModal, setOpenModal] = useState(null)
  const [modalData, setModalData] = useState(null)

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

  function resetAllData() {
    clearAll()
    window.location.reload()
  }

  const value = {
    // Children
    ...childrenApi,
    // Chores
    ...choresApi,
    // Settings
    ...settingsApi,
    // Navigation
    screen,
    activeChildId,
    navigate,
    // Modals
    openModal,
    modalData,
    showModal,
    closeModal,
    // Danger
    resetAllData,
  }

  return <AppContext.Provider value={value}>{reactChildren}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
