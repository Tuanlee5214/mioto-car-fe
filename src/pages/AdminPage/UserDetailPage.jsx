import { useEffect, useMemo, useState } from 'react'
import { assignUserRoles, getUserById, getUserRoles, removeUserRoles } from '../../services/adminUserService'
import { getRoles } from '../../services/roleService'

const USER_STATUSES = {
  1: { label: 'Đang hoạt động', className: 'active' },
  2: { label: 'Đã khóa', className: 'locked' },
  3: { label: 'Đã xóa', className: 'removed' },
}

function getInitials(name) {
  const words = String(name || 'U').trim().split(/\s+/).filter(Boolean)
  return words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase() : (words[0]?.slice(0, 2) || 'U').toUpperCase()
}

function getRoleIds(data) {
  return [...new Set((Array.isArray(data?.roleIds) ? data.roleIds : (data?.roles || []).map((role) => role.roleId))
    .filter((id) => id != null).map(Number))]
}

async function loadRoleCatalog() {
  const allRoles = []
  const seen = new Set()
  const batchSize = 20
  let offset = 0

  for (let page = 0; page < 50; page += 1) {
    const result = await getRoles({ count: batchSize, offset })
    if (!result.success) throw new Error(result.message)
    const batch = result.data || []
    for (const role of batch) {
      const id = role.roleId ?? role.id
      if (id == null || seen.has(Number(id))) continue
      seen.add(Number(id))
      allRoles.push({ ...role, roleId: Number(id) })
    }
    offset += batch.length
    if (batch.length < batchSize) break
  }

  return allRoles
}

function UserDetailPage({ userId, canViewRoles, canAssignRoles, readPermissionDisplayName, loggedInUserId, onBack, onRefreshPermissions }) {
  const [userState, setUserState] = useState({ loading: true, user: null, error: '' })
  const [rolesState, setRolesState] = useState(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState([])
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedRemovalIds, setSelectedRemovalIds] = useState([])
  const [removingRoles, setRemovingRoles] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  useEffect(() => {
    let mounted = true
    setUserState({ loading: true, user: null, error: '' })
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

  const viewUserRoles = async () => {
    setRolesState({ loading: true, data: null, error: '' })
    setSelectedRoleIds([])
    setSelectedRemovalIds([])
    setDeleteMode(false)
    setSaveMessage(null)
    try {
      const [userRoleResult, catalog] = await Promise.all([
        getUserRoles(userId),
        canAssignRoles ? loadRoleCatalog() : Promise.resolve(null),
      ])
      if (!userRoleResult.success) {
        setRolesState({ loading: false, data: null, error: userRoleResult.message })
        return
      }
      setRolesState({
        loading: false,
        data: userRoleResult.data || {},
        catalog,
        error: '',
      })
    } catch (error) {
      setRolesState({ loading: false, data: null, error: error.message || 'Không thể tải danh sách role.' })
    }
  }

  const currentRoleIds = useMemo(() => getRoleIds(rolesState?.data), [rolesState?.data])
  const currentIdSet = useMemo(() => new Set(currentRoleIds), [currentRoleIds])
  const availableRoles = useMemo(() => (rolesState?.catalog || [])
    .filter((role) => !currentIdSet.has(Number(role.roleId)))
    .filter((role) => `${role.displayName || ''} ${role.name || ''}`.toLowerCase().includes(roleSearch.trim().toLowerCase())),
  [rolesState?.catalog, currentIdSet, roleSearch])
  const currentRoles = rolesState?.data?.roles || []
  const user = userState.user || {}
  const status = USER_STATUSES[Number(user.status)] || { label: 'Không xác định', className: 'unknown' }

  const saveRoles = async () => {
    if (!selectedRoleIds.length || saving) return
    setSaving(true)
    setSaveMessage(null)
    try {
      // The API adds these role IDs to the user's existing assignments.
      const mergedRoleIds = [...new Set([...currentRoleIds, ...selectedRoleIds].map(Number))]
      const result = await assignUserRoles(userId, selectedRoleIds)
      if (!result.success) {
        setSaveMessage({ type: 'error', text: result.message })
        return
      }

      const returned = result.data || {}
      const assignedIds = getRoleIds(returned).length ? getRoleIds(returned) : mergedRoleIds
      const catalog = rolesState?.catalog || []
      const newRoles = catalog.filter((role) => assignedIds.includes(Number(role.roleId)))
      const returnedRoles = Array.isArray(returned.roles) ? returned.roles : []
      setRolesState((current) => ({
        ...current,
        data: {
          ...current.data,
          ...returned,
          roleIds: assignedIds,
          roles: returnedRoles.length ? returnedRoles : [...currentRoles, ...newRoles.filter((role) => !currentRoles.some((item) => Number(item.roleId) === Number(role.roleId)))],
        },
      }))
      setSelectedRoleIds([])
      setSaveMessage({ type: 'success', text: 'Đã cập nhật quyền cho user.' })
      if (String(userId) === String(loggedInUserId)) onRefreshPermissions?.()
    } catch {
      setSaveMessage({ type: 'error', text: 'Không thể kết nối máy chủ. Vui lòng thử lại.' })
    } finally {
      setSaving(false)
    }
  }

  const deleteSelectedRoles = async () => {
    if (!selectedRemovalIds.length || removingRoles) return
    setRemovingRoles(true)
    setSaveMessage(null)
    try {
      const result = await removeUserRoles(userId, selectedRemovalIds)
      if (!result.success) {
        setSaveMessage({ type: 'error', text: result.message })
        return
      }

      const returned = result.data || {}
      const remainingIds = Array.isArray(returned.roleIds)
        ? getRoleIds(returned)
        : currentRoleIds.filter((id) => !selectedRemovalIds.includes(id))
      const catalog = rolesState?.catalog || []
      const remainingRoles = Array.isArray(returned.roles)
        ? returned.roles
        : catalog.filter((role) => remainingIds.includes(Number(role.roleId)))
      setRolesState((current) => ({
        ...current,
        data: { ...current.data, ...returned, roleIds: remainingIds, roles: remainingRoles },
      }))
      setSelectedRemovalIds([])
      setSelectedRoleIds([])
      setDeleteMode(false)
      setSaveMessage({ type: 'success', text: 'Đã xóa quyền đã chọn.' })
      if (String(userId) === String(loggedInUserId)) onRefreshPermissions?.()
    } catch {
      setSaveMessage({ type: 'error', text: 'Không thể kết nối máy chủ. Vui lòng thử lại.' })
    } finally {
      setRemovingRoles(false)
    }
  }

  return (
    <section className="admin-user-detail-page" aria-labelledby="user-detail-title">
      <button type="button" className="admin-user-back" onClick={onBack}><span aria-hidden="true">←</span> Danh sách User</button>
      {userState.loading ? <div className="admin-brand-state">Đang tải hồ sơ user…</div>
        : userState.error ? <div className="admin-brand-error" role="alert">{userState.error}</div>
          : <>
            <header className="admin-user-profile-card">
              <div className="admin-user-profile-card__identity">
                <div className="admin-user-profile-card__avatar" aria-hidden="true">{getInitials(user.displayName)}</div>
                <div><span className="admin-module-card__eyebrow">HỒ SƠ NGƯỜI DÙNG · #{user.userId ?? userId}</span><h2 id="user-detail-title">{user.displayName || 'Chưa có tên'}</h2><p>{user.email || 'Chưa có email'}</p></div>
              </div>
              <span className={`admin-user-status admin-user-status--${status.className}`}>{status.label}</span>
            </header>

            <div className="admin-user-detail-grid">
              <section className="admin-user-panel" aria-labelledby="user-info-heading">
                <div className="admin-user-panel__heading"><span aria-hidden="true">◎</span><div><h3 id="user-info-heading">Thông tin tài khoản</h3><p>Thông tin hồ sơ người dùng</p></div></div>
                <dl className="admin-user-fields">
                  <div><dt>Mã người dùng</dt><dd>{user.userId ?? '—'}</dd></div>
                  <div><dt>Số điện thoại</dt><dd>{user.phone || '—'}</dd></div>
                  <div><dt>Email</dt><dd>{user.email || '—'}</dd></div>
                  <div><dt>Trạng thái</dt><dd><span className={`admin-user-status admin-user-status--${status.className}`}>{status.label}</span></dd></div>
                  <div><dt>Ngày tạo</dt><dd>{user.timeCreated == null ? '—' : new Date(Number(user.timeCreated)).toLocaleString('vi-VN')}</dd></div>
                  <div><dt>Cập nhật lần cuối</dt><dd>{user.timeUpdated == null ? '—' : new Date(Number(user.timeUpdated)).toLocaleString('vi-VN')}</dd></div>
                </dl>
              </section>

              <section className="admin-user-panel admin-user-access-panel" aria-labelledby="user-roles-heading">
                <div className="admin-user-panel__heading"><span aria-hidden="true">⌘</span><div><h3 id="user-roles-heading">Quyền truy cập</h3><p>Xem và quản lý role của user</p></div></div>
                {!canViewRoles ? <p className="admin-user-muted">Bạn cần quyền <strong>{readPermissionDisplayName}</strong> để xem danh sách quyền.</p> : <>
                  {!rolesState?.data && <button type="button" className="admin-user-primary-button" onClick={viewUserRoles} disabled={rolesState?.loading}>{rolesState?.loading ? 'Đang tải quyền…' : 'Xem danh sách quyền'}</button>}
                  {rolesState?.error && <p className="admin-user-feedback admin-user-feedback--error" role="alert">{rolesState.error}</p>}
                  {rolesState?.data && <>
                    {rolesState.data.isSuperAdmin && <div className="admin-user-superadmin">★ Tài khoản Super Admin</div>}
                    <div className="admin-user-current-roles">
                      <div className="admin-user-current-roles__heading"><h4>Role hiện tại <span>{currentRoles.length}</span></h4>{canAssignRoles && currentRoles.length > 0 && <button type="button" className={deleteMode ? 'admin-user-danger-button admin-user-danger-button--active' : 'admin-user-danger-button'} onClick={() => { setDeleteMode((current) => !current); setSelectedRemovalIds([]); setSaveMessage(null) }}>{deleteMode ? 'Hủy xóa' : 'Xóa role'}</button>}</div>
                      {deleteMode && <p className="admin-user-delete-hint">Chọn các role muốn gỡ khỏi user.</p>}
                      {currentRoles.length ? currentRoles.map((role) => {
                        const roleId = Number(role.roleId)
                        return <label className={deleteMode && selectedRemovalIds.includes(roleId) ? 'admin-user-role-card admin-user-role-card--selected' : 'admin-user-role-card'} key={role.roleId ?? role.name}>
                          {deleteMode && <input type="checkbox" checked={selectedRemovalIds.includes(roleId)} onChange={(event) => setSelectedRemovalIds((current) => event.target.checked ? [...new Set([...current, roleId])] : current.filter((id) => id !== roleId))} />}
                          <span><strong>{role.displayName || role.name}</strong></span><b aria-label="Đã được gán">✓</b>
                        </label>
                      }) : !rolesState.data.isSuperAdmin ? <p className="admin-user-muted">User chưa được gán role nào.</p> : null}
                      {deleteMode && <button type="button" className="admin-user-danger-confirm" onClick={deleteSelectedRoles} disabled={!selectedRemovalIds.length || removingRoles}>{removingRoles ? 'Đang xóa quyền…' : `Xóa ${selectedRemovalIds.length || ''} quyền đã chọn`}</button>}
                    </div>

                    {canAssignRoles && <div className="admin-user-assign-section">
                      <div className="admin-user-assign-heading"><h4>Gán thêm role</h4><span>Chỉ hiển thị role chưa được gán</span></div>
                      <label className="admin-user-role-search"><span aria-hidden="true">⌕</span><input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Tìm role theo tên…" /></label>
                      {rolesState.catalog ? availableRoles.length ? <div className="admin-user-role-options">
                        {availableRoles.map((role) => <label className={selectedRoleIds.includes(Number(role.roleId)) ? 'admin-user-role-option admin-user-role-option--selected' : 'admin-user-role-option'} key={role.roleId}>
                          <input type="checkbox" checked={selectedRoleIds.includes(Number(role.roleId))} onChange={(event) => setSelectedRoleIds((current) => event.target.checked ? [...new Set([...current, Number(role.roleId)])] : current.filter((id) => id !== Number(role.roleId)))} />
                          <span><strong>{role.displayName || role.name}</strong></span>
                          <i aria-hidden="true">{selectedRoleIds.includes(Number(role.roleId)) ? '✓' : '+'}</i>
                        </label>)}
                      </div> : <p className="admin-user-muted">Không còn role nào để gán.</p> : null}
                      {saveMessage && <p className={`admin-user-feedback admin-user-feedback--${saveMessage.type}`} role={saveMessage.type === 'error' ? 'alert' : 'status'}>{saveMessage.text}</p>}
                      <button type="button" className="admin-user-primary-button" onClick={saveRoles} disabled={!selectedRoleIds.length || saving}>{saving ? 'Đang lưu quyền…' : `Gán ${selectedRoleIds.length || ''} role đã chọn`}</button>
                    </div>}
                  </>}
                </>}
              </section>
            </div>
          </>}
    </section>
  )
}

export default UserDetailPage
