                                                                                                                                                                                                                                                                                                                                                            import SignUpForm from '../../components/auth/SignUpForm/SignUpForm'
import LoginHero from '../../components/auth/LoginHero/LoginHero'
import './SignUpPage.css'

function SignUpPage({ onNavigateToLogin }) {
  return (
    <div className="login-page">
      <LoginHero />

      <div className="login-panel">
        <SignUpForm onNavigateToLogin={onNavigateToLogin} />
      </div>
    </div>
  )
}

export default SignUpPage
