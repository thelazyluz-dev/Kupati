import { Component } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import ChildDashboard from './components/ChildDashboard.jsx'
import SettingsPanel from './components/settings/SettingsPanel.jsx'
import ModalRouter from './components/modals/ModalRouter.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', direction: 'ltr' }}>
          <h2 style={{ color: 'red' }}>שגיאה / Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f5f5f5', padding: 12 }}>
            {String(this.state.error)}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '8px 16px' }}>
            רענן / Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
      <div className="fixed bottom-2 inset-x-0 text-center text-[10px] text-white/25 pointer-events-none z-[1] select-none tracking-widest">
        made by illouzman
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </ErrorBoundary>
  )
}
