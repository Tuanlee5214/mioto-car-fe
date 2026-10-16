import { useCallback, useEffect, useRef, useState } from 'react'
import { getRoles } from '../../services/roleService'

const BATCH_SIZE = 20
const getRoleId = (role) => role?.roleId ?? role?.id

function RoleManagement({ onRefreshPermissions }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [listError, setListError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
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
      const result = await getRoles({ count: BATCH_SIZE, offset })
      if (!result.success) {
        setListError(result.message)
        if (reset) setRoles([])
        return
      }
      const batch = result.data
      setRoles((current) => {
        const base = reset ? [] : current
        const seen = new Set(base.map(getRoleId))
        return [...base, ...batch.filter((role) => {
          const id = getRoleId(role)
          if (id == null || seen.has(id)) return false
          seen.add(id)
          return true
        })]
      })
      offsetRef.current = offset + batch.length
      const more = batch.length === BATCH_SIZE
      hasMoreRef.current = more
      setHasMore(more)
    } catch {
      setListError('Không thể kết nối máy chủ. Vui lòng thử lại.')
      if (reset) setRoles([])
    } finally {
      loadingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { loadBatch(true) }, [loadBatch, reloadKey])
  useEffect(() => {
    const sentinel = listEndRef.current
    if (!sentinel || !hasMore || loading || loadingMore || listError) return undefined
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadBatch() }, { root: listScrollRef.current, rootMargin: '240px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, listError, loadBatch, roles.length])

  return (
    <section className="admin-brand-manager" aria-labelledby="role-heading">
      <div className="admin-brand-manager__heading">
        <div><span className="admin-module-card__eyebrow">PHÂN QUYỀN HỆ THỐNG</span><h2 id="role-heading">Danh sách vai trò</h2><p>Các quyền có thể được gán cho tài khoản trong hệ thống.</p></div>
        <button className="admin-refresh" type="button" onClick={onRefreshPermissions}><span aria-hidden="true">↻</span> Làm mới quyền</button>
      </div>
      {listError && <div className="admin-brand-error" role="alert"><span>{listError}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button></div>}
      <div ref={listScrollRef} className="admin-management-list-scroll">
        {loading ? <div className="admin-brand-state">Đang tải danh sách vai trò…</div> : roles.length ? <>
          <div className="admin-brand-table-wrap"><table className="admin-brand-table admin-role-table"><thead><tr><th scope="col">Mã</th><th scope="col">Quyền</th><th scope="col">Tên hiển thị</th></tr></thead><tbody>
            {roles.map((role, index) => <tr key={getRoleId(role) ?? `${role.name}-${index}`}><td>{getRoleId(role) ?? '—'}</td><td><code>{role.name || '—'}</code></td><td><strong>{role.displayName || 'Chưa có tên hiển thị'}</strong></td></tr>)}
          </tbody></table></div>
          <div ref={listEndRef} className="admin-brand-list-end" aria-live="polite">{loadingMore ? 'Đang tải thêm…' : hasMore ? 'Cuộn xuống để tải thêm vai trò' : 'Đã hiển thị hết vai trò'}</div>
        </> : !listError ? <div className="admin-brand-state"><strong>Chưa có vai trò</strong></div> : null}
      </div>
    </section>
  )
}

export default RoleManagement
