import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getUsers } from '../../services/adminUserService'
import UserDetailPage from './UserDetailPage'

const BATCH_SIZE = 20
const USER_STATUSES = {
  1: { label: 'Đang hoạt động', className: 'active' },
  2: { label: 'Đã khóa', className: 'locked' },
  3: { label: 'Đã xóa', className: 'removed' },
}

function getInitials(name) {
  const words = String(name || 'U').trim().split(/\s+/).filter(Boolean)
  return words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase() : (words[0]?.slice(0, 2) || 'U').toUpperCase()
}

function UserContactIcon({ type }) {
  return type === 'phone'
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.8h2.5l1.2 4.1-1.7 1.7a14.4 14.4 0 0 0 5.2 5.2l1.7-1.7 4.1 1.2v2.5a2 2 0 0 1-2.2 2A15.8 15.8 0 0 1 5.2 6a2 2 0 0 1 2-2.2Z" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></svg>
}

function UserManagement({ canViewRoles, canAssignRoles, readPermissionDisplayName, loggedInUserId, onRefreshPermissions }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [listError, setListError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const listEndRef = useRef(null)
  const listScrollRef = useRef(null)
  const loadingRef = useRef(false)
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(true)

  const loadBatch = useCallback(async (reset = false) => {
    if (loadingRef.current || (!reset && !hasMoreRef.current)) return
    loadingRef.current = true
    if (reset) {
      offsetRef.current = 0
      hasMoreRef.current = true
      setHasMore(true)
      setLoading(true)
      setListError('')
    } else setLoadingMore(true)

    const offset = reset ? 0 : offsetRef.current
    try {
      const result = await getUsers({ count: BATCH_SIZE, offset })
      if (!result.success) {
        setListError(result.message)
        if (reset) setUsers([])
        return
      }
      const batch = result.data
      setUsers((current) => {
        const base = reset ? [] : current
        const seen = new Set(base.map((user) => user.userId))
        return [...base, ...batch.filter((user) => {
          if (user.userId == null || seen.has(user.userId)) return false
          seen.add(user.userId)
          return true
        })]
      })
      offsetRef.current = offset + batch.length
      const more = batch.length === BATCH_SIZE
      hasMoreRef.current = more
      setHasMore(more)
    } catch {
      setListError('Không thể kết nối máy chủ. Vui lòng thử lại.')
      if (reset) setUsers([])
    } finally {
      loadingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { loadBatch(true) }, [loadBatch])
  useEffect(() => {
    const sentinel = listEndRef.current
    if (!sentinel || !hasMore || loading || loadingMore || listError) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadBatch()
    }, { root: listScrollRef.current, rootMargin: '240px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, listError, loadBatch, users.length])

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesStatus = statusFilter === 'all' || Number(user.status) === Number(statusFilter)
    const query = search.trim().toLowerCase()
    const matchesQuery = !query || [user.displayName, user.phone, user.email, user.userId]
      .some((value) => String(value ?? '').toLowerCase().includes(query))
    return matchesStatus && matchesQuery
  }), [users, search, statusFilter])
  const activeUserCount = users.filter((user) => Number(user.status) === 1).length

  if (selectedUserId != null) {
    return <UserDetailPage
      userId={selectedUserId}
      canViewRoles={canViewRoles}
      readPermissionDisplayName={readPermissionDisplayName}
      canAssignRoles={canAssignRoles}
      loggedInUserId={loggedInUserId}
      onBack={() => setSelectedUserId(null)}
      onRefreshPermissions={onRefreshPermissions}
    />
  }

  return (
    <section className="admin-brand-manager admin-user-manager" aria-labelledby="users-heading">
      <div className="admin-brand-manager__heading">
        <div><span className="admin-module-card__eyebrow">TÀI KHOẢN HỆ THỐNG</span><h2 id="users-heading">User</h2><p>Tra cứu hồ sơ, trạng thái và quyền truy cập của từng người dùng.</p></div>
        <button className="admin-refresh" type="button" onClick={onRefreshPermissions}><span aria-hidden="true">↻</span> Làm mới quyền</button>
      </div>
      {listError && <div className="admin-brand-error" role="alert"><span>{listError}</span><button type="button" onClick={() => loadBatch(true)}>Thử lại</button></div>}
      {!loading && users.length > 0 && <>
        <div className="admin-user-overview"><span><strong>{users.length}</strong><small>Đã tải user</small></span><span><strong>{activeUserCount}</strong><small>Đang hoạt động</small></span><span><strong>{users.length - activeUserCount}</strong><small>Trạng thái khác</small></span></div>
        <div className="admin-user-list-toolbar">
          <label className="admin-user-list-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email, số điện thoại hoặc ID" /></label>
          <div className="admin-user-status-filters" aria-label="Lọc trạng thái user">
            {[['all', 'Tất cả'], ['1', 'Hoạt động'], ['2', 'Đã khóa'], ['3', 'Đã xóa']].map(([value, label]) => <button type="button" key={value} className={statusFilter === value ? 'admin-user-filter admin-user-filter--active' : 'admin-user-filter'} onClick={() => setStatusFilter(value)}>{label}</button>)}
          </div>
        </div>
      </>}
      <div ref={listScrollRef} className="admin-management-list-scroll">
        {loading ? <div className="admin-brand-state">Đang tải danh sách user…</div> : users.length ? <>
          {filteredUsers.length ? <div className="admin-user-grid">{filteredUsers.map((user, index) => {
              const status = USER_STATUSES[Number(user.status)] || { label: 'Không xác định', className: 'unknown' }
              return <button type="button" className="admin-user-card" key={user.userId ?? index} onClick={() => setSelectedUserId(user.userId)} disabled={user.userId == null}>
                <span className="admin-user-card__top"><span className="admin-user-profile-card__avatar" aria-hidden="true">{user.imageUrl && <img src={user.imageUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling.hidden = false }} />}<span hidden={Boolean(user.imageUrl)}>{getInitials(user.displayName)}</span></span><span className={`admin-user-status admin-user-status--${status.className}`}>{status.label}</span></span>
                <span className="admin-user-card__name">{user.displayName || 'Chưa có tên'}</span>
                <span className="admin-user-card__id">USER #{user.userId ?? '—'}</span>
                <span className="admin-user-card__contact"><span><UserContactIcon type="phone" />{user.phone || 'Chưa có số điện thoại'}</span><span><UserContactIcon type="email" />{user.email || 'Chưa có email'}</span></span>
                <span className="admin-user-card__footer">Xem hồ sơ <b aria-hidden="true">→</b></span>
              </button>
            })}</div> : <div className="admin-user-empty-filter">Không tìm thấy user phù hợp với bộ lọc.</div>}
          <div ref={listEndRef} className="admin-brand-list-end" aria-live="polite">{loadingMore ? 'Đang tải thêm user…' : hasMore ? 'Cuộn xuống để tải thêm user' : 'Đã hiển thị hết người dùng'}</div>
        </> : !listError ? <div className="admin-brand-state"><strong>Chưa có người dùng</strong></div> : null}
      </div>
    </section>
  )
}

export default UserManagement
