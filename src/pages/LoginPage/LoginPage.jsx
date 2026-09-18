import LoginHero from '../../components/auth/LoginHero/LoginHero'
import LoginForm from '../../components/auth/LoginForm/LoginForm'
import './LoginPage.css'

function LoginPage({ onNavigateToSignUp }) {
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
