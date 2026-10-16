import { useCallback, useEffect, useRef, useState } from 'react'
import { createFeature, getFeatures, updateFeature } from '../../services/featureService'

const BATCH_SIZE = 20
const getFeatureId = (feature) => feature?.featureId ?? feature?.id
const getFeatureName = (feature) => feature?.nameFeature ?? feature?.name ?? ''

function FeatureManagement({ canWrite, onRefreshPermissions }) {
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [listError, setListError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [nameFeature, setNameFeature] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notification, setNotification] = useState(null)
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
      const result = await getFeatures({ count: BATCH_SIZE, offset })
      if (!result.success) {
        setListError(result.message)
        if (reset) setFeatures([])
        return
      }
      const batch = result.data
      setFeatures((current) => {
        const base = reset ? [] : current
        const seen = new Set(base.map(getFeatureId))
        return [...base, ...batch.filter((feature) => {
          const id = getFeatureId(feature)
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
      if (reset) setFeatures([])
    } finally {
      loadingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { loadBatch(true) }, [loadBatch, reloadKey])
  useEffect(() => {
    if (!notification) return undefined
    const timer = window.setTimeout(() => setNotification(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notification])
  useEffect(() => {
    const sentinel = listEndRef.current
    if (!sentinel || !hasMore || loading || loadingMore || listError) return undefined
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadBatch() }, { root: listScrollRef.current, rootMargin: '240px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, listError, loadBatch, features.length])

  const openCreateForm = () => {
    setEditingId(null)
    setNameFeature('')
    setFormError('')
    setFormOpen(true)
  }
  const openEditForm = (feature) => {
    setEditingId(getFeatureId(feature))
    setNameFeature(getFeatureName(feature))
    setFormError('')
    setFormOpen(true)
  }
  const handleSave = async (event) => {
    event.preventDefault()
    const trimmedName = nameFeature.trim()
    if (!trimmedName) { setFormError('Vui lòng nhập tên tính năng.'); return }
    setFormSaving(true)
    setFormError('')
    try {
      const result = editingId == null ? await createFeature(trimmedName) : await updateFeature(editingId, trimmedName)
      if (!result.success) { setFormError(result.message); return }
      setFormOpen(false)
      setNotification({ type: 'success', message: editingId == null ? 'Đã tạo tính năng xe.' : 'Đã cập nhật tính năng xe.' })
      setReloadKey((key) => key + 1)
    } catch { setFormError('Không thể kết nối máy chủ. Vui lòng thử lại.') }
    finally { setFormSaving(false) }
  }
  return (
    <section className="admin-brand-manager" aria-labelledby="feature-heading">
      <div className="admin-brand-manager__heading"><div><span className="admin-module-card__eyebrow">DANH MỤC HỆ THỐNG</span><h2 id="feature-heading">Tính năng xe</h2><p>Danh sách tiện nghi và tính năng có thể gắn với xe.</p></div>
        <div className="admin-manager-heading-actions">
          {canWrite && <button className="admin-brand-add" type="button" onClick={openCreateForm}><span aria-hidden="true">＋</span> Thêm tính năng</button>}
          <button className="admin-refresh" type="button" onClick={onRefreshPermissions}><span aria-hidden="true">↻</span> Làm mới quyền</button>
        </div>
      </div>
      {notification && <div className={`admin-brand-toast admin-brand-toast--${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}><span className="admin-brand-toast__icon" aria-hidden="true">{notification.type === 'error' ? '!' : '✓'}</span><p>{notification.message}</p><button type="button" aria-label="Đóng thông báo" onClick={() => setNotification(null)}>×</button></div>}
      {listError && <div className="admin-brand-error" role="alert"><span>{listError}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button></div>}
      <div ref={listScrollRef} className="admin-management-list-scroll">
      {loading ? <div className="admin-brand-state">Đang tải danh sách tính năng…</div> : features.length ? <>
        <div className="admin-brand-table-wrap"><table className="admin-brand-table"><thead><tr><th scope="col">Mã</th><th scope="col">Tên tính năng</th><th scope="col">Cập nhật lần cuối</th>{canWrite && <th scope="col" className="admin-brand-table__actions-heading">Thao tác</th>}</tr></thead><tbody>
          {features.map((feature, index) => {
            const id = getFeatureId(feature)
            const updatedAt = Number(feature?.updatedAt)
            const formattedDate = Number.isFinite(updatedAt) && updatedAt > 0 ? new Date(updatedAt).toLocaleString('vi-VN') : '—'
            return <tr key={id ?? `${getFeatureName(feature)}-${index}`}><td>{id ?? '—'}</td><td><strong>{getFeatureName(feature) || 'Chưa có tên'}</strong></td><td>{formattedDate}</td>{canWrite && <td className="admin-brand-table__actions"><button type="button" aria-label={`Sửa ${getFeatureName(feature)}`} title="Sửa" onClick={() => openEditForm(feature)}>✎</button></td>}</tr>
          })}
        </tbody></table></div>
        <div ref={listEndRef} className="admin-brand-list-end" aria-live="polite">{loadingMore ? 'Đang tải thêm…' : hasMore ? 'Cuộn xuống để tải thêm tính năng' : 'Đã hiển thị hết tính năng'}</div>
      </> : !listError ? <div className="admin-brand-state"><strong>Chưa có tính năng xe</strong>{canWrite && <span>Nhấn “Thêm tính năng” để tạo mục đầu tiên.</span>}</div> : null}
      </div>
      {formOpen && <div className="admin-brand-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !formSaving) setFormOpen(false) }}>
        <section className="admin-brand-modal" role="dialog" aria-modal="true" aria-labelledby="feature-form-title"><div className="admin-brand-modal__heading"><div><span className="admin-module-card__eyebrow">TÍNH NĂNG XE</span><h2 id="feature-form-title">{editingId == null ? 'Thêm tính năng' : 'Sửa tính năng'}</h2></div><button type="button" aria-label="Đóng" disabled={formSaving} onClick={() => setFormOpen(false)}>×</button></div>
          <form onSubmit={handleSave}><label htmlFor="feature-name">Tên tính năng</label><input id="feature-name" name="nameFeature" value={nameFeature} onChange={(event) => setNameFeature(event.target.value)} placeholder="Ví dụ: Ghế trẻ em" maxLength={100} autoFocus disabled={formSaving} />{formError && <p className="admin-brand-error-text" role="alert">{formError}</p>}<div className="admin-brand-modal__actions"><button type="button" className="admin-brand-cancel" disabled={formSaving} onClick={() => setFormOpen(false)}>Hủy</button><button type="submit" className="admin-brand-add" disabled={formSaving}>{formSaving ? 'Đang lưu…' : editingId == null ? 'Tạo tính năng' : 'Lưu thay đổi'}</button></div></form>
        </section>
      </div>}
    </section>
  )
}

export default FeatureManagement
