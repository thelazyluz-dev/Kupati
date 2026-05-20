import { Component } from 'react'
import { AppProvider, useApp } from './context/AppContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import ChildDashboard from './components/ChildDashboard.jsx'
import SettingsPanel from './components/settings/SettingsPanel.jsx'
import ModalRouter from './components/modals/ModalRouter.jsx'
import LoginScreen from './components/auth/LoginScreen.jsx'

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
    <div className="min-h-screen">
      {screen === 'home' && <HomeScreen />}
      {screen === 'dashboard' && activeChildId && (
        <ChildDashboard childId={activeChildId} />
      )}
      {screen === 'settings' && <SettingsPanel />}
      <ModalRouter />
      <div className="fixed bottom-1.5 inset-x-0 text-center text-[9px] text-slate-400/50 pointer-events-none z-0 select-none tracking-widest font-light">
        made by illouzman
      </div>
    </div>
  )
}

function AuthGate() {
  const { user } = useAuth()

  // Still determining auth state — blank screen (avoids flash)
  if (user === undefined) return null

  // Not logged in — show login screen
  if (user === null) return <LoginScreen />

  // Logged in — show the full app
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  )
}
