import { useNavigate } from 'react-router-dom'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()

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
        </div>
      </div>
    </div>
  )
}

export default HomePage
