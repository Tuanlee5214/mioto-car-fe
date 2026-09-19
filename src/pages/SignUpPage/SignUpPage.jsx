import { Navigate } from 'react-router-dom'
import SignUpForm from '../../components/auth/SignUpForm/SignUpForm'
import LoginHero from '../../components/auth/LoginHero/LoginHero'
import { getCurrentUser } from '../../services/authService'
import './SignUpPage.css'

function SignUpPage() {
  if (getCurrentUser()) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="login-page">
      <LoginHero />

      <div className="login-panel">
        <SignUpForm />
      </div>
    </div>
  )
}

export default SignUpPage
