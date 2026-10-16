import { useCallback, useEffect, useRef, useState } from 'react'
import { createDistrict, getDistricts, updateDistrict } from '../../services/districtService'
import { getProvinces } from '../../services/provinceService'

const BATCH_SIZE = 20
const PROVINCE_BATCH_SIZE = 100
const getProvinceId = (item) => item?.provinceId ?? item?.id
const getProvinceName = (item) => item?.provinceName ?? item?.nameProvince ?? item?.name ?? ''
const getDistrictId = (item) => item?.districtId ?? item?.id
const getDistrictName = (item) => item?.districtName ?? item?.nameDistrict ?? item?.name ?? ''
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function DistrictManagement({ canWrite, onRefreshPermissions }) {
  const [provinces, setProvinces] = useState([])
  const [provincesLoading, setProvincesLoading] = useState(true)
  const [provinceError, setProvinceError] = useState('')
  const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [listError, setListError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [nameDistrict, setNameDistrict] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notification, setNotification] = useState(null)
  const listEndRef = useRef(null)
  const listScrollRef = useRef(null)
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(true)
  const requestIdRef = useRef(0)
  const loadingRef = useRef(false)

  useEffect(() => {
    let mounted = true
    const loadProvinceOptions = async () => {
      setProvincesLoading(true)
      setProvinceError('')
      try {
        const all = []
        let offset = 0
        while (true) {
          const result = await getProvinces({ count: PROVINCE_BATCH_SIZE, offset })
          if (!result.success) throw new Error(result.message)
          all.push(...result.data)
          if (result.data.length < PROVINCE_BATCH_SIZE) break
          offset += result.data.length
        }
        if (!mounted) return
        setProvinces(all)
        const hcm = all.find((province) => normalize(getProvinceName(province)).includes('ho chi minh'))
        setSelectedProvinceId(String(getProvinceId(hcm || all[0]) ?? ''))
      } catch (error) {
        if (mounted) setProvinceError(error.message || 'Không thể tải danh sách tỉnh thành.')
      } finally { if (mounted) setProvincesLoading(false) }
    }
    loadProvinceOptions()
    return () => { mounted = false }
  }, [])

  const loadBatch = useCallback(async (reset = false) => {
    if (!selectedProvinceId || (loadingRef.current && !reset) || (!reset && !hasMoreRef.current)) return
    const requestId = reset ? ++requestIdRef.current : requestIdRef.current
    loadingRef.current = true
    if (reset) {
      offsetRef.current = 0
      hasMoreRef.current = true
      setHasMore(true)
      setLoading(true)
      setLoadingMore(false)
      setListError('')
    } else setLoadingMore(true)

    const offset = reset ? 0 : offsetRef.current
    try {
      const result = await getDistricts(selectedProvinceId, { count: BATCH_SIZE, offset })
      if (requestId !== requestIdRef.current) return
      if (!result.success) {
        setListError(result.message)
        if (reset) setDistricts([])
        return
      }
      const batch = result.data
      setDistricts((current) => {
        const base = reset ? [] : current
        const seen = new Set(base.map(getDistrictId))
        return [...base, ...batch.filter((item) => {
          const id = getDistrictId(item)
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
      if (requestId === requestIdRef.current) {
        setListError('Không thể kết nối máy chủ. Vui lòng thử lại.')
        if (reset) setDistricts([])
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [selectedProvinceId])

  useEffect(() => {
    if (selectedProvinceId) loadBatch(true)
  }, [selectedProvinceId, reloadKey, loadBatch])
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
  }, [hasMore, loading, loadingMore, listError, loadBatch, districts.length])

  const openCreateForm = () => {
    setEditingId(null)
    setNameDistrict('')
    setFormError('')
    setFormOpen(true)
  }
  const openEditForm = (district) => {
    setEditingId(getDistrictId(district))
    setNameDistrict(getDistrictName(district))
    setFormError('')
    setFormOpen(true)
  }
  const handleSave = async (event) => {
    event.preventDefault()
    const trimmedName = nameDistrict.trim()
    if (!trimmedName) { setFormError('Vui lòng nhập tên quận huyện.'); return }
    if (selectedProvinceId === '') { setFormError('Vui lòng chọn tỉnh thành.'); return }
    setFormSaving(true)
    setFormError('')
    try {
      const result = editingId == null
        ? await createDistrict(trimmedName, selectedProvinceId)
        : await updateDistrict(editingId, trimmedName)
      if (!result.success) { setFormError(result.message); return }
      setFormOpen(false)
      setNotification({ type: 'success', message: editingId == null ? 'Đã tạo quận huyện.' : 'Đã cập nhật quận huyện.' })
      setReloadKey((key) => key + 1)
    } catch { setFormError('Không thể kết nối máy chủ. Vui lòng thử lại.') }
    finally { setFormSaving(false) }
  }
  const selectedProvince = provinces.find((province) => String(getProvinceId(province)) === selectedProvinceId)
  return (
    <section className="admin-brand-manager" aria-labelledby="district-heading">
      <div className="admin-brand-manager__heading">
        <div><span className="admin-module-card__eyebrow">DANH MỤC HỆ THỐNG</span><h2 id="district-heading">Quận huyện</h2><p>Quản lý quận huyện theo từng tỉnh thành.</p></div>
        <div className="admin-manager-heading-actions">
          {canWrite && <button className="admin-brand-add" type="button" onClick={openCreateForm} disabled={!selectedProvinceId}><span aria-hidden="true">＋</span> Thêm quận huyện</button>}
          <button className="admin-refresh" type="button" onClick={onRefreshPermissions}><span aria-hidden="true">↻</span> Làm mới quyền</button>
        </div>
      </div>
      <div className="admin-district-filter"><label htmlFor="district-province"><span>Tỉnh thành</span><select id="district-province" value={selectedProvinceId} disabled={provincesLoading || Boolean(provinceError) || !provinces.length} onChange={(event) => { setDistricts([]); setSelectedProvinceId(event.target.value) }}>
        {provincesLoading && <option value="">Đang tải tỉnh thành…</option>}
        {!provincesLoading && !provinces.length && <option value="">Chưa có tỉnh thành</option>}
        {provinces.map((province) => <option key={getProvinceId(province)} value={String(getProvinceId(province))}>{getProvinceName(province)}</option>)}
      </select></label>{selectedProvince && <span>Đang xem quận huyện thuộc <strong>{getProvinceName(selectedProvince)}</strong></span>}{provinceError && <div className="admin-brand-error" role="alert">{provinceError}</div>}</div>
      {notification && <div className={`admin-brand-toast admin-brand-toast--${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}><span className="admin-brand-toast__icon" aria-hidden="true">{notification.type === 'error' ? '!' : '✓'}</span><p>{notification.message}</p><button type="button" aria-label="Đóng thông báo" onClick={() => setNotification(null)}>×</button></div>}
      {listError && <div className="admin-brand-error" role="alert"><span>{listError}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button></div>}
      <div ref={listScrollRef} className="admin-management-list-scroll">
      {loading || provincesLoading ? <div className="admin-brand-state">Đang tải danh sách quận huyện…</div> : districts.length ? <>
        <div className="admin-brand-table-wrap"><table className="admin-brand-table"><thead><tr><th scope="col">Mã</th><th scope="col">Tên quận huyện</th><th scope="col">Tỉnh thành</th>{canWrite && <th scope="col" className="admin-brand-table__actions-heading">Thao tác</th>}</tr></thead><tbody>
          {districts.map((district, index) => { const id = getDistrictId(district); return <tr key={id ?? `${getDistrictName(district)}-${index}`}><td>{id ?? '—'}</td><td><strong>{getDistrictName(district) || 'Chưa có tên'}</strong></td><td>{getProvinceName(selectedProvince) || district.provinceId || '—'}</td>{canWrite && <td className="admin-brand-table__actions"><button type="button" aria-label={`Sửa ${getDistrictName(district)}`} title="Sửa" onClick={() => openEditForm(district)}>✎</button></td>}</tr> })}
        </tbody></table></div>
        <div ref={listEndRef} className="admin-brand-list-end" aria-live="polite">{loadingMore ? 'Đang tải thêm…' : hasMore ? 'Cuộn xuống để tải thêm quận huyện' : 'Đã hiển thị hết quận huyện'}</div>
      </> : !listError && selectedProvinceId ? <div className="admin-brand-state"><strong>Chưa có quận huyện</strong>{canWrite && <span>Nhấn “Thêm quận huyện” để tạo mục đầu tiên cho tỉnh thành này.</span>}</div> : null}
      </div>
      {formOpen && <div className="admin-brand-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !formSaving) setFormOpen(false) }}>
        <section className="admin-brand-modal" role="dialog" aria-modal="true" aria-labelledby="district-form-title"><div className="admin-brand-modal__heading"><div><span className="admin-module-card__eyebrow">QUẬN HUYỆN · {getProvinceName(selectedProvince)}</span><h2 id="district-form-title">{editingId == null ? 'Thêm quận huyện' : 'Sửa quận huyện'}</h2></div><button type="button" aria-label="Đóng" disabled={formSaving} onClick={() => setFormOpen(false)}>×</button></div>
          <form onSubmit={handleSave}><label htmlFor="district-name">Tên quận huyện</label><input id="district-name" name="nameDistrict" value={nameDistrict} onChange={(event) => setNameDistrict(event.target.value)} placeholder="Ví dụ: Bình Thạnh" maxLength={100} autoFocus disabled={formSaving} />{formError && <p className="admin-brand-error-text" role="alert">{formError}</p>}<div className="admin-brand-modal__actions"><button type="button" className="admin-brand-cancel" disabled={formSaving} onClick={() => setFormOpen(false)}>Hủy</button><button type="submit" className="admin-brand-add" disabled={formSaving}>{formSaving ? 'Đang lưu…' : editingId == null ? 'Tạo quận huyện' : 'Lưu thay đổi'}</button></div></form>
        </section>
      </div>}
    </section>
  )
}

export default DistrictManagement
