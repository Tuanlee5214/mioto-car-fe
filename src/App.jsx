import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage/LoginPage'
import SignUpPage from './pages/SignUpPage/SignUpPage'
import HomePage from './pages/HomePage/HomePage'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import AdminPage from './pages/AdminPage/AdminPage'
import MyCarsPage from './pages/MyCarsPage/MyCarsPage'
import SearchCarsPage from './pages/SearchCarsPage/SearchCarsPage'
import { checkAuth } from './services/authService'

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
      <Route path="/home" element={<HomePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/my-cars" element={<MyCarsPage />} />
      <Route path="/cars/search" element={<SearchCarsPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
