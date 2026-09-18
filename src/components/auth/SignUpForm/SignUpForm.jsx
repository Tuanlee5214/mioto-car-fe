import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../ui/Button/Button'
import InputField from '../../ui/InputField/InputField'
import { validateSignUpForm } from '../../../utils/validation'
import { signUpUser } from '../../../services/authService'
import './SignUpForm.css'

function SignUpForm() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    email: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    const nextForm = {
      ...form,
      [name]: value,
    }

    setForm(nextForm)
    setErrors(validateSignUpForm(nextForm))

    if (serverError) {
      setServerError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitted(true)

    const nextErrors = validateSignUpForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setLoading(true)
    setServerError('')

    try {
      const result = await signUpUser({
        phone: form.phone,
        pwd: form.password,
        displayName: form.displayName,
        email: form.email,
      })

      if (result.success) {
        navigate('/home')
        return
      }

      setServerError(result.message)
    } catch (error) {
      setServerError('Không thể kết nối máy chủ, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-card sign-up-card">
      <div className="login-card__header">
        <span className="eyebrow">Chào mừng</span>
        <h2>Đăng ký</h2>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <InputField
          label="Số điện thoại"
          type="tel"
          name="phone"
          placeholder="098 765 4321"
          autoComplete="tel"
          value={form.phone}
          onChange={handleChange}
        />
        {(isSubmitted || form.phone) && errors.phone && <span className="field-error">{errors.phone}</span>}

        <InputField
          label="Tên hiển thị"
          type="text"
          name="displayName"
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          value={form.displayName}
          onChange={handleChange}
        />
        {(isSubmitted || form.displayName) && errors.displayName && <span className="field-error">{errors.displayName}</span>}

        <InputField
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
        />
        {(isSubmitted || form.email) && errors.email && <span className="field-error">{errors.email}</span>}

        <InputField
          label="Mật khẩu"
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Nhập mật khẩu của bạn"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
        >
          <button
            type="button"
            className="input-field__toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M3 3l18 18" />
              </svg>
            )}
          </button>
        </InputField>
        {(isSubmitted || form.password) && errors.password && <span className="field-error">{errors.password}</span>}

        <InputField
          label="Xác nhận mật khẩu"
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
        >
          <button
            type="button"
            className="input-field__toggle"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
          >
            {showConfirmPassword ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M3 3l18 18" />
              </svg>
            )}
          </button>
        </InputField>
        {(isSubmitted || form.confirmPassword) && errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}

        {serverError && <div className="login-form__api-error">{serverError}</div>}

        <Button type="submit" disabled={loading}>
          {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
        </Button>
      </form>

      <p className="signup-text">
        Đã có tài khoản?{' '}
        <button type="button" className="text-link-btn" onClick={() => navigate('/')}>
          Đăng nhập
        </button>
      </p>
    </div>
  )
}

export default SignUpForm
