import { useCallback, useEffect, useRef, useState } from 'react'
import { createProvince, getProvinces, updateProvince } from '../../services/provinceService'

const BATCH_SIZE = 20
const getProvinceId = (province) => province?.provinceId ?? province?.id
const getProvinceName = (province) => province?.provinceName ?? province?.nameProvince ?? province?.name ?? ''

function ProvinceManagement({ canWrite, onRefreshPermissions }) {
  const [provinces, setProvinces] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [listError, setListError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [nameProvince, setNameProvince] = useState('')
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
      const result = await getProvinces({ count: BATCH_SIZE, offset })
      if (!result.success) {
        setListError(result.message)
        if (reset) setProvinces([])
        return
      }
      const batch = result.data
      setProvinces((current) => {
        const base = reset ? [] : current
        const seen = new Set(base.map(getProvinceId))
        return [...base, ...batch.filter((item) => {
          const id = getProvinceId(item)
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
      if (reset) setProvinces([])
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
  }, [hasMore, loading, loadingMore, listError, loadBatch, provinces.length])

  const openCreateForm = () => {
    setEditingId(null)
    setNameProvince('')
    setFormError('')
    setFormOpen(true)
  }

  const openEditForm = (province) => {
    const id = getProvinceId(province)
    setEditingId(id)
    setNameProvince(getProvinceName(province))
    setFormError('')
    setFormOpen(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const trimmedName = nameProvince.trim()
    if (!trimmedName) { setFormError('Vui lòng nhập tên tỉnh thành.'); return }
    setFormSaving(true)
    setFormError('')
    try {
      const result = editingId == null ? await createProvince(trimmedName) : await updateProvince(editingId, trimmedName)
      if (!result.success) { setFormError(result.message); return }
      setFormOpen(false)
      setNotification({ type: 'success', message: editingId == null ? 'Đã tạo tỉnh thành.' : 'Đã cập nhật tỉnh thành.' })
      setReloadKey((key) => key + 1)
    } catch { setFormError('Không thể kết nối máy chủ. Vui lòng thử lại.') }
    finally { setFormSaving(false) }
  }

  return (
    <section className="admin-brand-manager" aria-labelledby="province-heading">
      <div className="admin-brand-manager__heading">
        <div><span className="admin-module-card__eyebrow">DANH MỤC HỆ THỐNG</span><h2 id="province-heading">Tỉnh thành</h2><p>Danh sách tỉnh và thành phố được sử dụng trong hệ thống.</p></div>
        <div className="admin-manager-heading-actions">
          {canWrite && <button className="admin-brand-add" type="button" onClick={openCreateForm}><span aria-hidden="true">＋</span> Thêm tỉnh thành</button>}
          <button className="admin-refresh" type="button" onClick={onRefreshPermissions}><span aria-hidden="true">↻</span> Làm mới quyền</button>
        </div>
      </div>
      {notification && <div className={`admin-brand-toast admin-brand-toast--${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}><span className="admin-brand-toast__icon" aria-hidden="true">{notification.type === 'error' ? '!' : '✓'}</span><p>{notification.message}</p><button type="button" aria-label="Đóng thông báo" onClick={() => setNotification(null)}>×</button></div>}
      {listError && <div className="admin-brand-error" role="alert"><span>{listError}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button></div>}
      <div ref={listScrollRef} className="admin-management-list-scroll">
      {loading ? <div className="admin-brand-state">Đang tải danh sách tỉnh thành…</div> : provinces.length ? <>
        <div className="admin-brand-table-wrap"><table className="admin-brand-table"><thead><tr><th scope="col">Mã</th><th scope="col">Tên tỉnh thành</th>{canWrite && <th scope="col" className="admin-brand-table__actions-heading">Thao tác</th>}</tr></thead>
          <tbody>{provinces.map((province, index) => {
            const id = getProvinceId(province)
            return <tr key={id ?? `${getProvinceName(province)}-${index}`}><td>{id ?? '—'}</td><td><strong>{getProvinceName(province) || 'Chưa có tên'}</strong></td>{canWrite && <td className="admin-brand-table__actions"><button type="button" aria-label={`Sửa ${getProvinceName(province)}`} title="Sửa" onClick={() => openEditForm(province)}>✎</button></td>}</tr>
          })}</tbody></table></div>
        <div ref={listEndRef} className="admin-brand-list-end" aria-live="polite">{loadingMore ? 'Đang tải thêm…' : hasMore ? 'Cuộn xuống để tải thêm tỉnh thành' : 'Đã hiển thị hết tỉnh thành'}</div>
      </> : !listError ? <div className="admin-brand-state"><strong>Chưa có tỉnh thành</strong>{canWrite && <span>Nhấn “Thêm tỉnh thành” để tạo mục đầu tiên.</span>}</div> : null}
      </div>
      {formOpen && <div className="admin-brand-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !formSaving) setFormOpen(false) }}>
        <section className="admin-brand-modal" role="dialog" aria-modal="true" aria-labelledby="province-form-title"><div className="admin-brand-modal__heading"><div><span className="admin-module-card__eyebrow">TỈNH THÀNH</span><h2 id="province-form-title">{editingId == null ? 'Thêm tỉnh thành' : 'Sửa tỉnh thành'}</h2></div><button type="button" aria-label="Đóng" disabled={formSaving} onClick={() => setFormOpen(false)}>×</button></div>
          <form onSubmit={handleSave}><label htmlFor="province-name">Tên tỉnh thành</label><input id="province-name" name="nameProvince" value={nameProvince} onChange={(event) => setNameProvince(event.target.value)} placeholder="Ví dụ: Gia Lai" maxLength={100} autoFocus disabled={formSaving} />{formError && <p className="admin-brand-error-text" role="alert">{formError}</p>}<div className="admin-brand-modal__actions"><button type="button" className="admin-brand-cancel" disabled={formSaving} onClick={() => setFormOpen(false)}>Hủy</button><button type="submit" className="admin-brand-add" disabled={formSaving}>{formSaving ? 'Đang lưu…' : editingId == null ? 'Tạo tỉnh thành' : 'Lưu thay đổi'}</button></div></form>
        </section>
      </div>}
    </section>
  )
}

export default ProvinceManagement
