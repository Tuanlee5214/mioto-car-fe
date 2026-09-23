import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginHero from '../../components/auth/LoginHero/LoginHero'
import LoginForm from '../../components/auth/LoginForm/LoginForm'
import { checkAuth } from '../../services/authService'
import './LoginPage.css'

function LoginPage({ onNavigateToSignUp }) {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const verify = async () => {
      const result = await checkAuth()
      if (!cancelled && result.success && result.authenticated) {
        navigate('/home', { replace: true })
      }
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="login-page">
      <LoginHero />

      <div className="login-panel">
        <LoginForm onNavigateToSignUp={onNavigateToSignUp} />
      </div>
    </div>
  )
}

export default LoginPage
