import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../ui/Button/Button'
import InputField from '../../ui/InputField/InputField'
import GoogleIcon from '../../ui/GoogleIcon/GoogleIcon'
import { validateLoginForm } from '../../../utils/validation'
import { loginUser } from '../../../services/authService'
import './LoginForm.css'

function LoginForm({ onNavigateToSignUp }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    phone: '',
    password: '',
    remember: true,
  })
  const [errors, setErrors] = useState({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    const nextForm = {
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    }

    setForm(nextForm)
    setErrors(validateLoginForm(nextForm))

    if (apiError) {
      setApiError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitted(true)

    const nextErrors = validateLoginForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setLoading(true)
    setApiError('')

    try {
      const result = await loginUser({
        phone: form.phone,
        pwd: form.password,
      })

      if (result.success) {
        navigate('/home', {
          state: {
            user: result.data,
            toast: {
              type: 'success',
              message: 'Đăng nhập thành công.',
            },
          },
        })
        return
      }

      setApiError(result.message)
    } catch (error) {
      setApiError('Không thể kết nối máy chủ, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-card">
      <div className="login-card__header">
        <span className="eyebrow">Chào mừng</span>
        <h2>Đăng nhập</h2>
      </div>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <InputField
          label="Số điện thoại"
          type="tel"
          name="phone"
          placeholder="098 765 4321"
          autoComplete="tel"
          value={form.phone}
          onChange={handleChange}
          disabled={loading}
        />
        {(isSubmitted || form.phone) && errors.phone && <span className="field-error">{errors.phone}</span>}

        <InputField
          label="Mật khẩu"
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Nhập mật khẩu của bạn"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          disabled={loading}
        >
          <button
            type="button"
            className="input-field__toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            disabled={loading}
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

        <div className="login-form__meta">
          <label className="checkbox">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
              disabled={loading}
            />
            <span>Ghi nhớ tôi</span>
          </label>

          <a href="#" className="text-link">
            Quên mật khẩu?
          </a>
        </div>

        {apiError && <div className="login-form__api-error">{apiError}</div>}

        <Button type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      <div className="divider">
        <span>hoặc</span>
      </div>

      <Button variant="secondary" type="button" className="social-button" disabled={loading}>
        <GoogleIcon />
        Tiếp tục với Google
      </Button>

      <p className="signup-text">
        Chưa có tài khoản?{' '}
        <button type="button" className="text-link-btn" onClick={onNavigateToSignUp || (() => navigate('/signup'))}>
          Tạo tài khoản
        </button>
      </p>
    </div>
  )
}

export default LoginForm
