import { useState } from 'react'
import Button from '../../ui/Button/Button'
import InputField from '../../ui/InputField/InputField'
import './LoginForm.css'

function LoginForm() {
  const [form, setForm] = useState({
    phone: '',
    password: '',
    remember: true,
  })

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    console.log('Login submitted:', form)
  }

  return (
    <div className="login-card">
      <div className="login-card__header">
        <span className="eyebrow">Chào mừng</span>
        <h2>Đăng nhập</h2>
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

        <InputField
          label="Mật khẩu"
          type="password"
          name="password"
          placeholder="Nhập mật khẩu của bạn"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
        />

        <div className="login-form__meta">
          <label className="checkbox">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            <span>Ghi nhớ tôi</span>
          </label>

          <a href="#" className="text-link">
            Quên mật khẩu?
          </a>
        </div>

        <Button type="submit">Đăng nhập</Button>
      </form>

      <div className="divider">
        <span>hoặc</span>
      </div>

      <Button variant="secondary" type="button">
        Tiếp tục với Google
      </Button>

      <p className="signup-text">
        Chưa có tài khoản? <a href="#">Tạo tài khoản</a>
      </p>
    </div>
  )
}

export default LoginForm
