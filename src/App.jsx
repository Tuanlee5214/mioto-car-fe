import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage/LoginPage'
import SignUpPage from './pages/SignUpPage/SignUpPage'
import HomePage from './pages/HomePage/HomePage'
import { checkAuth } from './services/authService'

function RequireAuth({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    const verify = async () => {
      const result = await checkAuth()
      if (!mounted) return

      const nextAuthenticated = Boolean(result.success && result.authenticated)
      setAuthenticated(nextAuthenticated)

      if (!nextAuthenticated && location.pathname !== '/login' && location.pathname !== '/signup') {
        navigate('/login', { replace: true })
      }

      setReady(true)
    }

    verify()

    return () => {
      mounted = false
    }
  }, [location.pathname, navigate])

  if (!ready) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>Đang kiểm tra phiên đăng nhập...</div>
  }

  if (!authenticated) {
    return null
  }

  return children
}

function PublicRoute({ children, redirectTo = '/home' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const verify = async () => {
      const result = await checkAuth()
      if (!mounted) return

      if (result.success && result.authenticated && (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup')) {
        navigate(redirectTo, { replace: true })
      }

      setReady(true)
    }

    verify()

    return () => {
      mounted = false
    }
  }, [location.pathname, navigate, redirectTo])

  if (!ready) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>Đang kiểm tra phiên đăng nhập...</div>
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUpPage />
          </PublicRoute>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
