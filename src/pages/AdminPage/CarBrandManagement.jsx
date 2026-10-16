import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createCarBrand,
  getCarBrandById,
  getCarBrands,
  updateCarBrand,
} from '../../services/carBrandService'

const BATCH_SIZE = 20

function getBrandId(brand) {
  return brand?.carBrandId ?? brand?.brandId ?? brand?.id
}

function getBrandName(brand) {
  return brand?.nameBrand ?? brand?.name ?? ''
}

function CarBrandManagement({ canWrite, onRefreshPermissions }) {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [listError, setListError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [nameBrand, setNameBrand] = useState('')
  const [formLoading, setFormLoading] = useState(false)
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
    } else {
      setLoadingMore(true)
    }

    const offset = reset ? 0 : offsetRef.current
    try {
      const result = await getCarBrands({ count: BATCH_SIZE, offset })
      if (!result.success) {
        setListError(result.message)
        if (reset) setBrands([])
        return
      }

      const batch = result.data
      setBrands((current) => {
        const base = reset ? [] : current
        const seen = new Set(base.map(getBrandId))
        return [...base, ...batch.filter((brand) => {
          const id = getBrandId(brand)
          if (id == null || seen.has(id)) return false
          seen.add(id)
          return true
        })]
      })
      offsetRef.current = offset + batch.length
      const moreAvailable = batch.length === BATCH_SIZE
      hasMoreRef.current = moreAvailable
      setHasMore(moreAvailable)
    } catch {
      setListError('Không thể kết nối máy chủ. Vui lòng thử lại.')
      if (reset) setBrands([])
    } finally {
      loadingRef.current = false
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    // Loading the first batch is the external data sync for this module.
    // oxlint-disable-next-line react/set-state-in-effect
    loadBatch(true)
  }, [loadBatch, reloadKey])

  useEffect(() => {
    if (!notification) return undefined
    const timer = window.setTimeout(() => setNotification(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    const sentinel = listEndRef.current
    if (!sentinel || !hasMore || loading || loadingMore || listError) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadBatch()
    }, { root: listScrollRef.current, rootMargin: '240px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, listError, loadBatch, brands.length])

  const openCreateForm = () => {
    setEditingId(null)
    setNameBrand('')
    setFormError('')
    setFormOpen(true)
  }

  const openEditForm = async (brand) => {
    const id = getBrandId(brand)
    setEditingId(id)
    setNameBrand(getBrandName(brand))
    setFormError('')
    setFormOpen(true)
    setFormLoading(true)
    try {
      const result = await getCarBrandById(id)
      if (!result.success) {
        setFormError(result.message)
        return
      }
      const detail = result.data?.carBrand || result.data
      setNameBrand(getBrandName(detail) || getBrandName(brand))
    } catch {
      setFormError('Không thể tải thông tin thương hiệu xe.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const trimmedName = nameBrand.trim()
    if (!trimmedName) {
      setFormError('Vui lòng nhập tên thương hiệu.')
      return
    }

    setFormSaving(true)
    setFormError('')
    try {
      const result = editingId == null
        ? await createCarBrand(trimmedName)
        : await updateCarBrand(editingId, trimmedName)
      if (!result.success) {
        setFormError(result.message)
        return
      }

      setFormOpen(false)
      setNotification({
        type: 'success',
        message: editingId == null ? 'Đã tạo thương hiệu xe.' : 'Đã cập nhật thương hiệu xe.',
      })
      setReloadKey((key) => key + 1)
    } catch {
      setFormError('Không thể kết nối máy chủ. Vui lòng thử lại.')
    } finally {
      setFormSaving(false)
    }
  }

  return (
    <section className="admin-brand-manager" aria-labelledby="car-brand-heading">
      <div className="admin-brand-manager__heading">
        <div>
          <span className="admin-module-card__eyebrow">DANH MỤC HỆ THỐNG</span>
          <h2 id="car-brand-heading">Thương hiệu xe</h2>
          <p>Danh sách thương hiệu được sử dụng trong hệ thống.</p>
        </div>
        <div className="admin-manager-heading-actions">
          {canWrite && <button className="admin-brand-add" type="button" onClick={openCreateForm} aria-label="Thêm thương hiệu"><span aria-hidden="true">＋</span> Thêm thương hiệu</button>}
          <button className="admin-refresh" type="button" onClick={onRefreshPermissions}><span aria-hidden="true">↻</span> Làm mới quyền</button>
        </div>
      </div>

      {notification && (
        <div className={`admin-brand-toast admin-brand-toast--${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}>
          <span className="admin-brand-toast__icon" aria-hidden="true">{notification.type === 'error' ? '!' : '✓'}</span>
          <p>{notification.message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setNotification(null)}>×</button>
        </div>
      )}
      {listError && (
        <div className="admin-brand-error" role="alert">
          <span>{listError}</span>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button>
        </div>
      )}

      <div ref={listScrollRef} className="admin-management-list-scroll">
      {loading ? (
        <div className="admin-brand-state">Đang tải danh sách thương hiệu…</div>
      ) : brands.length ? (
        <>
          <div className="admin-brand-table-wrap">
            <table className="admin-brand-table">
              <thead>
                <tr>
                  <th scope="col">Mã</th>
                  <th scope="col">Tên thương hiệu</th>
                  {canWrite && <th scope="col" className="admin-brand-table__actions-heading">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {brands.map((brand, index) => {
                  const id = getBrandId(brand)
                  return (
                    <tr key={id ?? `${getBrandName(brand)}-${index}`}>
                      <td>{id ?? '—'}</td>
                      <td><strong>{getBrandName(brand) || 'Chưa có tên'}</strong></td>
                      {canWrite && (
                        <td className="admin-brand-table__actions">
                          <button type="button" aria-label={`Sửa ${getBrandName(brand)}`} title="Sửa" onClick={() => openEditForm(brand)}>✎</button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div ref={listEndRef} className="admin-brand-list-end" aria-live="polite">
            {loadingMore ? 'Đang tải thêm…' : hasMore ? 'Cuộn xuống để tải thêm thương hiệu' : 'Đã hiển thị hết thương hiệu'}
          </div>
        </>
      ) : !listError ? (
        <div className="admin-brand-state">
          <strong>Chưa có thương hiệu xe</strong>
          {canWrite && <span>Nhấn “Thêm thương hiệu” để tạo mục đầu tiên.</span>}
        </div>
      ) : null}
      </div>

      {formOpen && (
        <div className="admin-brand-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !formSaving) setFormOpen(false)
        }}>
          <section className="admin-brand-modal" role="dialog" aria-modal="true" aria-labelledby="admin-brand-form-title">
            <div className="admin-brand-modal__heading">
              <div>
                <span className="admin-module-card__eyebrow">THƯƠNG HIỆU XE</span>
                <h2 id="admin-brand-form-title">{editingId == null ? 'Thêm thương hiệu' : 'Sửa thương hiệu'}</h2>
              </div>
              <button type="button" aria-label="Đóng" disabled={formSaving} onClick={() => setFormOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <label htmlFor="car-brand-name">Tên thương hiệu</label>
              <input
                id="car-brand-name"
                name="nameBrand"
                value={nameBrand}
                onChange={(event) => setNameBrand(event.target.value)}
                placeholder="Ví dụ: Toyota"
                maxLength={100}
                autoFocus
                disabled={formLoading || formSaving}
              />
              {formError && <p className="admin-brand-error-text" role="alert">{formError}</p>}
              <div className="admin-brand-modal__actions">
                <button type="button" className="admin-brand-cancel" disabled={formSaving} onClick={() => setFormOpen(false)}>Hủy</button>
                <button type="submit" className="admin-brand-add" disabled={formLoading || formSaving}>
                  {formLoading ? 'Đang tải…' : formSaving ? 'Đang lưu…' : editingId == null ? 'Tạo thương hiệu' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default CarBrandManagement
