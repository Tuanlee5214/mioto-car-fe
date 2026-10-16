import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginHero from '../../components/auth/LoginHero/LoginHero'
import LoginForm from '../../components/auth/LoginForm/LoginForm'
import { checkAuth } from '../../services/authService'
import './LoginPage.css'

function LoginPage({ onNavigateToSignUp, redirectTo = '/home', checkExistingSession = true, onSuccess }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!checkExistingSession) return undefined
    let cancelled = false

    const verify = async () => {
      const result = await checkAuth()
      if (!cancelled && result.success && result.authenticated) {
        navigate(redirectTo, { replace: true })
      }
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [checkExistingSession, navigate, redirectTo])

  return (
    <div className="login-page">
      <LoginHero />

      <div className="login-panel">
        <LoginForm
          onNavigateToSignUp={onNavigateToSignUp}
          onSuccess={(user) => {
            if (onSuccess) {
              onSuccess(user)
              return
            }
            navigate(redirectTo, { replace: true })
          }}
        />
      </div>
    </div>
  )
}

export default LoginPage
