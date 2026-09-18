import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../../services/authService'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogout = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await logoutUser()

      if (result.success) {
        navigate('/')
        return
      }

      setError(result.message)
    } catch {
      setError('Không thể kết nối máy chủ, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-page">
      <div className="home-card">
        <span className="home-badge">Mioto</span>
        <h1>Chào mừng bạn đã quay lại</h1>
        <p>
          Bạn đã đăng nhập thành công. Trang home này là nơi chúng ta sẽ tiếp tục xây
          dựng flow sau khi login.
        </p>

        <div className="home-actions">
          <button type="button" className="primary-button" onClick={() => navigate('/')}>
            Về trang đăng nhập
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/signup')}>
            Đi đến đăng ký
          </button>
          <button type="button" className="danger-button" onClick={handleLogout} disabled={loading}>
            {loading ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>

        {error && <p className="logout-error">{error}</p>}
      </div>
    </div>
  )
}

export default HomePage
