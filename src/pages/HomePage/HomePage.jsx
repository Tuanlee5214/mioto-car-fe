import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'
import { getMyProfile } from '../../services/userService'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  const handleLogout = async () => {
    setLoading(true)
    setLogoutError('')

    try {
      const result = await logoutUser()

      if (result.success) {
        navigate('/')
        return
      }

      setLogoutError(result.message)
    } catch {
      setLogoutError('Không thể kết nối máy chủ, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleProfile = async () => {
    if (profile) {
      setProfile(null)
      setProfileError('')
      return
    }

    setProfileLoading(true)
    setProfileError('')

    try {
      const result = await getMyProfile()

      if (result.success) {
        setProfile(result.data)
        return
      }

      setProfileError(result.message)
    } catch {
      setProfileError('Không thể kết nối máy chủ, vui lòng thử lại.')
    } finally {
      setProfileLoading(false)
    }
  }

  const statusText = profile?.status === 1 ? 'Active' : 'Inactive'
  const statusClass = profile?.status === 1 ? 'profile-status profile-status--active' : 'profile-status profile-status--inactive'
  const currentUser = getCurrentUser()

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
          <button type="button" className="primary-button" onClick={handleToggleProfile} disabled={profileLoading}>
            {profileLoading ? 'Đang tải...' : profile ? 'Đóng' : 'Lấy thông tin của tôi'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/signup')}>
            Đi đến đăng ký
          </button>
          <button type="button" className="danger-button" onClick={handleLogout} disabled={loading}>
            {loading ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>

        {profileError && <p className="logout-error">{profileError}</p>}
        {logoutError && <p className="logout-error">{logoutError}</p>}


        {profile && (
          <div className="profile-card">
            <div className="profile-avatar">{profile.displayName?.charAt(0)?.toUpperCase() || 'U'}</div>

            <div className="profile-header">
              <div>
                <p className="profile-label">Tên hiển thị</p>
                <h3>{profile.displayName || 'Người dùng'}</h3>
              </div>
              <span className={statusClass}>{statusText}</span>
            </div>

            <div className="profile-grid">
              <div className="profile-item">
                <span className="profile-label">User ID</span>
                <strong>{profile.userId || 'N/A'}</strong>
              </div>

              <div className="profile-item">
                <span className="profile-label">Số điện thoại</span>
                <strong>{profile.phone || 'N/A'}</strong>
              </div>

              <div className="profile-item">
                <span className="profile-label">Email</span>
                <strong>{profile.email || 'N/A'}</strong>
              </div>

              <div className="profile-item">
                <span className="profile-label">Trạng thái</span>
                <strong>{profile.status === 1 ? 'Đang hoạt động' : 'Không hoạt động'}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
