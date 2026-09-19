import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'
import { getMyProfile, updateMyProfile } from '../../services/userService'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ email: '', displayName: '' })
  const [saveLoading, setSaveLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({ email: '', displayName: '' })
  const [toast, setToast] = useState({ type: '', message: '' })

  useEffect(() => {
    const initialToast = location.state?.toast

    if (initialToast?.message) {
      setToast({ type: initialToast.type || 'success', message: initialToast.message })
    }
  }, [location.state])

  useEffect(() => {
    if (!toast.message) return undefined

    const timer = setTimeout(() => {
      setToast({ type: '', message: '' })
    }, 2500)

    return () => clearTimeout(timer)
  }, [toast.message])

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
      setIsEditing(false)
      setToast({ type: '', message: '' })
      return
    }

    setProfileLoading(true)
    setProfileError('')
    setToast({ type: '', message: '' })

    try {
      const result = await getMyProfile()

      if (result.success) {
        const nextProfile = result.data || {}
        setProfile(nextProfile)
        setForm({
          email: nextProfile.email || '',
          displayName: nextProfile.displayName || '',
        })
        setIsEditing(false)
        return
      }

      setProfileError(result.message)
    } catch {
      setProfileError('Không thể kết nối máy chủ, vui lòng thử lại.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleEditClick = () => {
    if (!profile) return
    setForm({
      email: profile.email || '',
      displayName: profile.displayName || '',
    })
    setFieldErrors({ email: '', displayName: '' })
    setToast({ type: '', message: '' })
    setIsEditing(true)
  }

  const validateProfileForm = (nextForm) => {
    const nextErrors = {
      email: '',
      displayName: '',
    }

    if (!nextForm.displayName || !nextForm.displayName.trim()) {
      nextErrors.displayName = 'Tên hiển thị không được để trống.'
    }

    if (!nextForm.email || !nextForm.email.trim()) {
      nextErrors.email = 'Email không được để trống.'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(nextForm.email.trim())) {
        nextErrors.email = 'Email không đúng định dạng.'
      }
    }

    return nextErrors
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    const nextForm = {
      ...form,
      [name]: value,
    }

    setForm(nextForm)
    setFieldErrors(validateProfileForm(nextForm))
  }

  const handleSaveProfile = async () => {
    const nextErrors = validateProfileForm(form)
    setFieldErrors(nextErrors)

    if (nextErrors.email || nextErrors.displayName) {
      setToast({
        type: 'error',
        message: nextErrors.email || nextErrors.displayName,
      })
      return
    }

    setSaveLoading(true)
    setProfileError('')

    try {
      const result = await updateMyProfile(form)

      if (result.success) {
        const nextProfile = result.data || {}
        setProfile(nextProfile)
        setForm({
          email: nextProfile.email || '',
          displayName: nextProfile.displayName || '',
        })
        setIsEditing(false)
        setToast({
          type: 'success',
          message: 'Cập nhật thông tin thành công.',
        })
        return
      }

      setToast({
        type: 'error',
        message: result.message || 'Cập nhật thông tin thất bại.',
      })
      setProfileError(result.message)
    } catch {
      const message = 'Không thể kết nối máy chủ, vui lòng thử lại.'
      setToast({ type: 'error', message })
      setProfileError(message)
    } finally {
      setSaveLoading(false)
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
          <button type="button" className="danger-button" onClick={handleLogout} disabled={loading}>
            {loading ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>

        {profileError && <p className="logout-error">{profileError}</p>}
        {logoutError && <p className="logout-error">{logoutError}</p>}

        {toast.message && (
          <div className={`toast toast--${toast.type}`} role="alert">
            {toast.message}
          </div>
        )}


        {profile && (
          <div className="profile-card">
            <div className="profile-avatar">{profile.displayName?.charAt(0)?.toUpperCase() || 'U'}</div>

            <div className="profile-header">
              <div>
                <p className="profile-label">Tên hiển thị</p>
                {!isEditing ? (
                  <h3>{profile.displayName || 'Người dùng'}</h3>
                ) : (
                  <input
                    className="profile-input"
                    type="text"
                    name="displayName"
                    value={form.displayName}
                    onChange={handleFormChange}
                  />
                )}
                {isEditing && fieldErrors.displayName && <span className="field-error">{fieldErrors.displayName}</span>}
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
                {!isEditing ? (
                  <strong>{profile.email || 'N/A'}</strong>
                ) : (
                  <input
                    className="profile-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                  />
                )}
                {isEditing && fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </div>

              <div className="profile-item">
                <span className="profile-label">Trạng thái</span>
                <strong>{profile.status === 1 ? 'Đang hoạt động' : 'Không hoạt động'}</strong>
              </div>
            </div>

            {!isEditing ? (
              <button type="button" className="primary-button profile-action" onClick={handleEditClick}>
                Sửa thông tin
              </button>
            ) : (
              <div className="profile-action-group">
                <button type="button" className="primary-button" onClick={handleSaveProfile} disabled={saveLoading}>
                  {saveLoading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setIsEditing(false)
                    setForm({
                      email: profile.email || '',
                      displayName: profile.displayName || '',
                    })
                    setFieldErrors({ email: '', displayName: '' })
                    setToast({ type: '', message: '' })
                  }}
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
