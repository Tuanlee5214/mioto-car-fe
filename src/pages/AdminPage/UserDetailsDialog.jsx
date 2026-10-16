import { useEffect, useState } from 'react'
import { getUserById, getUserRoles } from '../../services/adminUserService'

const USER_STATUSES = {
  1: { label: 'Đang hoạt động', className: 'active' },
  2: { label: 'Đã khóa', className: 'locked' },
  3: { label: 'Đã xóa', className: 'removed' },
}

function getInitials(name) {
  const words = String(name || 'U').trim().split(/\s+/).filter(Boolean)
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : (words[0]?.slice(0, 2) || 'U').toUpperCase()
}

function UserDetailsDialog({ userId, onClose, canViewRoles = false }) {
  const [userState, setUserState] = useState({ loading: true, user: null, error: '' })
  const [rolesState, setRolesState] = useState(null)

  useEffect(() => {
    let mounted = true
    setUserState({ loading: true, user: null, error: '' })
    setRolesState(null)
    getUserById(userId).then((result) => {
      if (!mounted) return
      setUserState(result.success
        ? { loading: false, user: result.data, error: '' }
        : { loading: false, user: null, error: result.message })
    }).catch(() => {
      if (mounted) setUserState({ loading: false, user: null, error: 'Không thể kết nối máy chủ.' })
    })
    return () => { mounted = false }
  }, [userId])

  const showRoles = async () => {
    setRolesState({ loading: true, data: null, error: '' })
    try {
      const result = await getUserRoles(userId)
      setRolesState(result.success
        ? { loading: false, data: result.data, error: '' }
        : { loading: false, data: null, error: result.message })
    } catch {
      setRolesState({ loading: false, data: null, error: 'Không thể kết nối máy chủ.' })
    }
  }

  const user = userState.user || {}
  const name = user.displayName || 'Người dùng'
  const status = USER_STATUSES[Number(user.status)] || { label: 'Không xác định', className: 'unknown' }
  const roles = rolesState?.data?.roles || []

  return (
    <div className="admin-user-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="admin-user-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-user-dialog-title">
        <header className="admin-user-dialog__header">
          <div className="admin-user-avatar" aria-hidden="true">{getInitials(name)}</div>
          <div><span className="admin-module-card__eyebrow">HỒ SƠ NGƯỜI DÙNG</span><h2 id="admin-user-dialog-title">{userState.loading ? 'Đang tải thông tin…' : name}</h2></div>
          <button type="button" className="admin-user-dialog__close" aria-label="Đóng" onClick={onClose}>×</button>
        </header>

        {userState.loading ? <div className="admin-brand-state">Đang tải thông tin người dùng…</div>
          : userState.error ? <div className="admin-brand-error" role="alert">{userState.error}</div>
            : <>
              <dl className="admin-user-fields">
                <div><dt>Mã người dùng</dt><dd>{user.userId ?? '—'}</dd></div>
                <div><dt>Số điện thoại</dt><dd>{user.phone || '—'}</dd></div>
                <div><dt>Email</dt><dd>{user.email || '—'}</dd></div>
                <div><dt>Trạng thái</dt><dd><span className={`admin-user-status admin-user-status--${status.className}`}>{status.label}</span></dd></div>
                {user.timeCreated != null && <div><dt>Ngày tạo</dt><dd>{new Date(Number(user.timeCreated)).toLocaleString('vi-VN')}</dd></div>}
                {user.timeUpdated != null && <div><dt>Cập nhật lần cuối</dt><dd>{new Date(Number(user.timeUpdated)).toLocaleString('vi-VN')}</dd></div>}
              </dl>

              {canViewRoles && <section className="admin-user-roles">
                <button type="button" className="admin-refresh" onClick={showRoles} disabled={rolesState?.loading}>
                  {rolesState?.loading ? 'Đang tải quyền…' : 'Xem danh sách quyền của user'}
                </button>
                {rolesState?.error && <p className="admin-user-roles__error" role="alert">{rolesState.error}</p>}
                {rolesState?.data && <div className="admin-user-role-list">
                  <p>{rolesState.data.isSuperAdmin ? 'Super Admin' : 'Danh sách quyền'}</p>
                  {roles.length ? roles.map((role) => <span key={role.roleId ?? role.name}><strong>{role.displayName || role.name}</strong><code>{role.name}</code></span>) : !rolesState.data.isSuperAdmin ? <span>Người dùng chưa được gán quyền nào.</span> : null}
                </div>}
              </section>}
            </>}
      </section>
    </div>
  )
}

export default UserDetailsDialog
