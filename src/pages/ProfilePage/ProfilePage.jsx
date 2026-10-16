import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'
import { getMyProfile, updateMyProfile } from '../../services/userService'
import { isValidDisplayName, isValidEmail } from '../../utils/validation'
import './ProfilePage.css'

function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(getCurrentUser())
  const [form, setForm] = useState({ displayName: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [editing, setEditing] = useState(false)
  const [notification, setNotification] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({ displayName: '', email: '' })

  useEffect(() => {
    if (!notification) return undefined
    const timer = window.setTimeout(() => setNotification(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      try {
        const result = await getMyProfile()
        if (!mounted) return
        if (result.success) {
          const user = result.data || {}
          setProfile(user)
          setForm({
            displayName: user.displayName || '',
            email: user.email || '',
          })
        } else {
          setNotification({ type: 'error', message: result.message || 'Không thể tải thông tin người dùng.' })
          const cachedUser = getCurrentUser()
          if (cachedUser) {
            setForm({
              displayName: cachedUser.displayName || '',
              email: cachedUser.email || '',
            })
          }
        }
      } catch {
        if (mounted) setNotification({ type: 'error', message: 'Không thể kết nối máy chủ, vui lòng thử lại.' })
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadProfile()
    return () => { mounted = false }
  }, [])

  const validate = (values) => {
    const errors = { displayName: '', email: '' }
    if (!values.displayName.trim()) errors.displayName = 'Tên hiển thị không được để trống.'
    else if (!isValidDisplayName(values.displayName)) errors.displayName = 'Tên hiển thị không được chứa ký tự đặc biệt.'
    if (!values.email.trim()) {
      errors.email = 'Email không được để trống.'
    } else if (!isValidEmail(values.email)) {
      errors.email = 'Email không đúng định dạng.'
    }
    return errors
  }

  const handleChange = (event) => {
    const nextForm = { ...form, [event.target.name]: event.target.value }
    setForm(nextForm)
    setFieldErrors(validate(nextForm))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const errors = validate(form)
    setFieldErrors(errors)
    if (errors.displayName || errors.email) return

    setSaving(true)
    setNotification(null)
    try {
      const result = await updateMyProfile(form)
      if (result.success) {
        setProfile(result.data)
        setForm({
          displayName: result.data.displayName || '',
          email: result.data.email || '',
        })
        setEditing(false)
        setNotification({ type: 'success', message: 'Cập nhật thông tin thành công.' })
      } else {
        setNotification({ type: 'error', message: result.message || 'Không thể cập nhật thông tin.' })
      }
    } catch {
      setNotification({ type: 'error', message: 'Không thể kết nối máy chủ, vui lòng thử lại.' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    setNotification(null)
    try {
      const result = await logoutUser()
      if (result.success) {
        navigate('/', { replace: true })
      } else {
        setNotification({ type: 'error', message: result.message || 'Đăng xuất thất bại.' })
      }
    } catch {
      setNotification({ type: 'error', message: 'Không thể kết nối máy chủ, vui lòng thử lại.' })
    } finally {
      setLoggingOut(false)
    }
  }

  const displayName = profile?.displayName || profile?.name || form.displayName || 'Người dùng'
  const avatar = profile?.avatarUrl || profile?.avatar || profile?.imageUrl

  return (
    <div className="profile-page">
      {notification && (
        <div
          className={`profile-toast profile-toast--${notification.type}`}
          role={notification.type === 'error' ? 'alert' : 'status'}
        >
          <span className="profile-toast__icon" aria-hidden="true">
            {notification.type === 'error' ? '!' : '✓'}
          </span>
          <p>{notification.message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      <header className="profile-site-header">
        <Link className="profile-brand" to="/" aria-label="Trở về trang chủ Mioto">
          <span className="profile-brand__mark">M</span>
          <span>mioto</span>
        </Link>
        <Link className="profile-back-link" to="/">← Trở về trang chủ</Link>
      </header>

      <main className="profile-main">
        <div className="profile-page-heading">
          <div>
            <span className="profile-page-eyebrow">Tài khoản Mioto</span>
            <h1>Thông tin cá nhân</h1>
            <p>Quản lý thông tin tài khoản và đăng xuất tại đây.</p>
          </div>
          <button className="profile-logout-button" type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>

        <section className="profile-details-card" aria-label="Thông tin tài khoản">
          <div className="profile-user-heading">
            {avatar
              ? <img className="profile-page-avatar" src={avatar} alt="" />
              : <span className="profile-page-avatar profile-page-avatar--initial">{displayName.trim().charAt(0).toUpperCase() || 'U'}</span>}
            <div>
              <h2>{displayName}</h2>
              <p>Thành viên Mioto</p>
            </div>
          </div>

          {loading ? (
            <p className="profile-page-loading">Đang tải thông tin tài khoản...</p>
          ) : editing ? (
            <form className="profile-details-form" onSubmit={handleSave}>
              <div className="profile-edit-heading">
                <h3>Chỉnh sửa thông tin</h3>
                <p>Nhập thông tin mới rồi nhấn “Cập nhật” để lưu thay đổi.</p>
              </div>
              <label>
                <span>Tên hiển thị</span>
                <input
                  name="displayName"
                  value={form.displayName}
                  onChange={handleChange}
                  autoComplete="name"
                  autoFocus
                  disabled={saving}
                />
                {fieldErrors.displayName && <small>{fieldErrors.displayName}</small>}
              </label>
              <label>
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={saving}
                />
                {fieldErrors.email && <small>{fieldErrors.email}</small>}
              </label>
              <div className="profile-page-actions">
                <button className="profile-save-button" type="submit" disabled={saving}>
                  {saving ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
                <button
                  className="profile-cancel-button"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setForm({
                      displayName: profile?.displayName || profile?.name || '',
                      email: profile?.email || '',
                    })
                    setFieldErrors({ displayName: '', email: '' })
                    setNotification(null)
                    setEditing(false)
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info-section">
              <div className="profile-info-heading">
                <div>
                  <h3>Chi tiết tài khoản</h3>
                  <p>Thông tin cá nhân của bạn trên Mioto</p>
                </div>
                <button
                  className="profile-save-button"
                  type="button"
                  onClick={() => {
                    setForm({
                      displayName: profile?.displayName || profile?.name || '',
                      email: profile?.email || '',
                    })
                    setFieldErrors({ displayName: '', email: '' })
                    setNotification(null)
                    setEditing(true)
                  }}
                >
                  Chỉnh sửa hồ sơ
                </button>
              </div>
              <dl className="profile-info-grid">
                <div className="profile-info-item">
                  <dt>Tên hiển thị</dt>
                  <dd>{profile?.displayName || profile?.name || 'Chưa cập nhật'}</dd>
                </div>
                <div className="profile-info-item">
                  <dt>Email</dt>
                  <dd>{profile?.email || 'Chưa cập nhật'}</dd>
                </div>
                <div className="profile-info-item">
                  <dt>Số điện thoại</dt>
                  <dd>{profile?.phone || 'Chưa cập nhật'}</dd>
                </div>
                <div className="profile-info-item">
                  <dt>Mã người dùng</dt>
                  <dd>{profile?.userId || profile?.id || 'Chưa cập nhật'}</dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default ProfilePage
