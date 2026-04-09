import { AppProvider, useApp } from './context/AppContext.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import ChildDashboard from './components/ChildDashboard.jsx'
import SettingsPanel from './components/settings/SettingsPanel.jsx'
import ModalRouter from './components/modals/ModalRouter.jsx'

function AppInner() {
  const { screen, activeChildId } = useApp()

  return (
    <div className="min-h-screen bg-slate-100">
      {screen === 'home' && <HomeScreen />}
      {screen === 'dashboard' && activeChildId && (
        <ChildDashboard childId={activeChildId} />
      )}
      {screen === 'settings' && <SettingsPanel />}
      <ModalRouter />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
