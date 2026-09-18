                                                                                                                                                                                                                                                                                                                                                            import SignUpForm from '../../components/auth/SignUpForm/SignUpForm'
import LoginHero from '../../components/auth/LoginHero/LoginHero'
import './SignUpPage.css'

function SignUpPage() {
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
