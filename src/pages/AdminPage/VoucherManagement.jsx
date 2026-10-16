import { useEffect, useState } from 'react'
import { buildApiUrl } from '../../constants/api'
import { createVoucher, deleteVoucher, getVoucherById, getVouchers, updateVoucher, uploadVoucherImage } from '../../services/voucherService'

const blank = { title: '', code: '', body: '', discountPercent: '', maxDiscount: '', startDate: '', endDate: '' }
const idOf = (voucher) => voucher?.voucherId ?? voucher?.id
const inputDate = (value) => {
  const date = new Date(Number(value))
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const dateLabel = (value) => {
  const date = new Date(Number(value))
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN')
}
const imageOf = (voucher) => {
  const image = voucher?.imageUrl
  if (image) return image.startsWith('http') || image.startsWith('data:') || image.startsWith('blob:') || image.startsWith('//') ? image : buildApiUrl(image.startsWith('/') ? image : '/images/vouchers/' + image)
  return voucher?.publicId ? buildApiUrl('/images/vouchers/' + voucher.publicId) : ''
}

function VoucherManagement({ canWrite, onRefreshPermissions }) {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank)
  const [pickedImage, setPickedImage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true); setError('')
      try {
        const all = []
        let offset = 0
        while (active) {
          const result = await getVouchers({ count: 20, offset })
          if (!result.success) throw new Error(result.message)
          all.push(...result.data)
          if (result.data.length < 20) break
          offset += result.data.length
        }
        if (active) setVouchers(all)
      } catch (loadError) { if (active) { setVouchers([]); setError(loadError.message || 'Không thể tải danh sách voucher.') } }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const clearPickedImage = () => {
    if (pickedImage?.preview) URL.revokeObjectURL(pickedImage.preview)
    setPickedImage(null)
  }
  const closeForm = () => { clearPickedImage(); setFormOpen(false); setFormError('') }
  const openCreate = () => { clearPickedImage(); setEditing(null); setForm(blank); setFormError(''); setFormOpen(true) }
  const setVoucherForm = (voucher) => setForm({
    title: voucher.title || '', code: voucher.code || '', body: voucher.body || '',
    discountPercent: voucher.discountPercent ?? '', maxDiscount: voucher.maxDiscount ?? '',
    startDate: inputDate(voucher.startDate), endDate: inputDate(voucher.endDate),
  })
  const openEdit = async (voucher) => {
    clearPickedImage(); setDetail(null); setEditing(voucher); setVoucherForm(voucher); setFormOpen(true); setFormError('')
    try {
      const result = await getVoucherById(idOf(voucher))
      if (result.success) { setEditing(result.data); setVoucherForm(result.data) }
    } catch { /* Use the voucher row as a fallback. */ }
  }
  const openDetail = async (voucher) => {
    setDetail(voucher); setDetailLoading(true)
    try {
      const result = await getVoucherById(idOf(voucher))
      if (result.success) setDetail(result.data)
      else setNotice(result.message)
    } catch (detailError) { setNotice(detailError.message || 'Không thể tải thông tin voucher.') }
    finally { setDetailLoading(false) }
  }
  const confirmDelete = async () => {
    if (!canWrite || !deleteTarget || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      const result = await deleteVoucher(idOf(deleteTarget))
      if (!result.success) { setDeleteError(result.message); return }
      setVouchers((current) => current.filter((voucher) => idOf(voucher) !== idOf(deleteTarget)))
      if (idOf(detail) === idOf(deleteTarget)) setDetail(null)
      setDeleteTarget(null)
      setNotice('Đã xóa voucher.')
    } catch (deleteRequestError) { setDeleteError(deleteRequestError.message || 'Không thể xóa voucher.') }
    finally { setDeleting(false) }
  }
  const selectImage = async (event) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    clearPickedImage()
    const preview = URL.createObjectURL(file)
    setPickedImage({ file, preview, publicId: '' }); setUploading(true); setFormError('')
    try {
      const result = await uploadVoucherImage(file)
      if (!result.success) throw new Error(result.message)
      setPickedImage((current) => current?.file === file ? { ...current, publicId: result.data } : current)
    } catch (uploadError) {
      setPickedImage((current) => current?.file === file ? { ...current, error: uploadError.message } : current)
    } finally { setUploading(false) }
  }
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const save = async (event) => {
    event.preventDefault()
    if (!canWrite) return
    if (uploading) { setFormError('Đợi ảnh tải xong rồi hãy lưu.'); return }
    if (!editing && !pickedImage?.publicId) { setFormError('Vui lòng tải lên một ảnh voucher.'); return }
    const startDate = new Date(form.startDate).getTime()
    const endDate = new Date(form.endDate).getTime()
    if (!Number.isFinite(startDate) || !Number.isFinite(endDate) || endDate <= startDate) { setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.'); return }
    const publicId = pickedImage?.publicId || editing?.publicId
    if (!publicId) { setFormError('Voucher chưa có ảnh. Vui lòng tải lên một ảnh.'); return }
    setSaving(true); setFormError('')
    const payload = {
      title: form.title.trim(), code: form.code.trim(), body: form.body.trim(),
      discountPercent: Number(form.discountPercent), maxDiscount: Number(form.maxDiscount),
      startDate, endDate, images: [{ publicId }],
    }
    try {
      const result = editing ? await updateVoucher(idOf(editing), payload) : await createVoucher(payload)
      if (!result.success) { setFormError(result.message); return }
      closeForm(); setNotice(editing ? 'Đã cập nhật voucher.' : 'Đã tạo voucher.')
      setReload((value) => value + 1)
    } catch (saveError) { setFormError(saveError.message || 'Không thể lưu voucher.') }
    finally { setSaving(false) }
  }
  const preview = pickedImage?.preview || imageOf(editing)

  return <section className="admin-brand-manager admin-voucher-manager" aria-labelledby="voucher-heading">
    <div className="admin-brand-manager__heading">
      <div><span className="admin-module-card__eyebrow">ƯU ĐÃI VÀ KHUYẾN MÃI</span><h2 id="voucher-heading">Quản lý voucher</h2><p>Tạo mã ưu đãi, quản lý thời hạn và hình ảnh voucher.</p></div>
      <div className="admin-manager-heading-actions">{canWrite && <button className="admin-brand-add" type="button" onClick={openCreate}>＋ Thêm voucher</button>}<button className="admin-refresh" type="button" onClick={onRefreshPermissions}>↻ Làm mới quyền</button></div>
    </div>
    {notice && <div className="admin-brand-toast admin-brand-toast--success" role="status"><p>{notice}</p><button type="button" aria-label="Đóng" onClick={() => setNotice('')}>×</button></div>}
    {error && <div className="admin-brand-error" role="alert"><span>{error}</span><button type="button" onClick={() => setReload((value) => value + 1)}>Thử lại</button></div>}
    <div className="admin-management-list-scroll">
      {loading ? <div className="admin-brand-state">Đang tải danh sách voucher…</div> : vouchers.length ? <div className="admin-brand-table-wrap"><table className="admin-brand-table admin-voucher-table"><thead><tr><th>Ảnh</th><th>Voucher</th><th>Mã</th><th>Giảm giá</th><th>Thời hạn</th><th>Thao tác</th></tr></thead><tbody>
        {vouchers.map((voucher, index) => {
          const image = imageOf(voucher)
          const id = idOf(voucher)
          return <tr
            key={id ?? voucher.code + index}
            className="admin-voucher-row"
            tabIndex="0"
            aria-label={'Xem chi tiết voucher ' + (voucher.title || voucher.code)}
            onClick={() => openDetail(voucher)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openDetail(voucher)
              }
            }}
          >
            <td>{image ? <img className="admin-voucher-thumb" src={image} alt={voucher.title || voucher.code} /> : <span className="admin-voucher-thumb admin-voucher-thumb--empty">🎟️</span>}</td>
            <td className="admin-voucher-title-cell"><strong>{voucher.title || 'Chưa có tiêu đề'}</strong><small className="admin-voucher-row-description">{voucher.body || ''}</small></td>
            <td><span className="admin-voucher-code">{voucher.code || '—'}</span></td>
            <td><span className="admin-voucher-discount"><strong>{voucher.discountPercent ?? '—'}%</strong><small>Tối đa {Number(voucher.maxDiscount || 0).toLocaleString('vi-VN')}đ</small></span></td>
            <td><span className="admin-voucher-dates"><strong>{dateLabel(voucher.startDate)}</strong><small>đến {dateLabel(voucher.endDate)}</small></span></td>
            <td className="admin-brand-table__actions">{canWrite && <><button type="button" aria-label={'Sửa voucher ' + (voucher.code || id)} onClick={(event) => { event.stopPropagation(); openEdit(voucher) }} onKeyDown={(event) => event.stopPropagation()}>✎</button><button className="admin-voucher-delete" type="button" aria-label={'Xóa voucher ' + (voucher.code || id)} title="Xóa voucher" onClick={(event) => { event.stopPropagation(); setDeleteError(''); setDeleteTarget(voucher) }} onKeyDown={(event) => event.stopPropagation()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 14H7L6 7Zm3 3v8h2v-8H9Zm4 0v8h2v-8h-2ZM4 4h5l1-2h4l1 2h5v2H4V4Z" /></svg></button></>}</td>
          </tr>
        })}
      </tbody></table></div> : !error ? <div className="admin-brand-state"><strong>Chưa có voucher</strong>{canWrite && <span>Thêm voucher để bắt đầu.</span>}</div> : null}
    </div>

    {formOpen && canWrite && <div className="admin-voucher-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !uploading) closeForm() }}><section className="admin-voucher-modal" role="dialog" aria-modal="true" aria-labelledby="voucher-form-title">
      <header className="admin-voucher-modal__header"><div><span className="admin-module-card__eyebrow">QUẢN LÝ ƯU ĐÃI</span><h2 id="voucher-form-title">{editing ? 'Cập nhật voucher' : 'Tạo voucher mới'}</h2></div><button type="button" aria-label="Đóng" disabled={saving || uploading} onClick={closeForm}>×</button></header>
      <form className="admin-voucher-form" onSubmit={save}>
        <div className="admin-voucher-image-field"><label htmlFor="voucher-image">Ảnh voucher (1 ảnh)</label><input id="voucher-image" type="file" accept="image/*" onChange={selectImage} disabled={uploading || saving} />{preview && <div className="admin-voucher-image-preview"><img src={preview} alt="Xem trước voucher" /><span>{uploading ? 'Đang tải ảnh…' : pickedImage?.error || (pickedImage?.publicId ? 'Ảnh mới đã tải lên' : 'Ảnh hiện tại · chọn ảnh mới để thay thế')}</span></div>}</div>
        <label>Tiêu đề<input name="title" required maxLength="160" value={form.title} onChange={change} /></label>
        <label>Mã voucher<input name="code" required maxLength="60" value={form.code} onChange={change} /></label>
        <label className="admin-voucher-form__wide">Nội dung<textarea name="body" rows="3" required value={form.body} onChange={change} /></label>
        <label>Phần trăm giảm<input name="discountPercent" type="number" min="1" max="100" step="0.01" required value={form.discountPercent} onChange={change} /></label>
        <label>Mức giảm tối đa (đ)<input name="maxDiscount" type="number" min="0" step="1000" required value={form.maxDiscount} onChange={change} /></label>
        <label>Thời gian bắt đầu<input name="startDate" type="datetime-local" required value={form.startDate} onChange={change} /></label>
        <label>Thời gian kết thúc<input name="endDate" type="datetime-local" required value={form.endDate} onChange={change} /></label>
        {formError && <p className="admin-brand-error-text admin-voucher-form__wide" role="alert">{formError}</p>}
        <div className="admin-voucher-form__actions admin-voucher-form__wide"><button type="button" className="admin-brand-cancel" disabled={saving || uploading} onClick={closeForm}>Hủy</button><button type="submit" className="admin-brand-add" disabled={saving || uploading}>{saving ? 'Đang lưu…' : uploading ? 'Đang tải ảnh…' : editing ? 'Lưu thay đổi' : 'Tạo voucher'}</button></div>
      </form>
    </section></div>}

    {deleteTarget && canWrite && <div className="admin-voucher-backdrop admin-voucher-confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null) }}><section className="admin-voucher-confirm" role="alertdialog" aria-modal="true" aria-labelledby="voucher-delete-title" aria-describedby="voucher-delete-description"><span className="admin-voucher-confirm__icon" aria-hidden="true">!</span><h2 id="voucher-delete-title">Xóa voucher này?</h2><p id="voucher-delete-description">Voucher <strong>{deleteTarget.title || deleteTarget.code}</strong> sẽ bị xóa khỏi hệ thống.</p>{deleteError && <p className="admin-brand-error-text" role="alert">{deleteError}</p>}<div><button type="button" className="admin-brand-cancel" disabled={deleting} onClick={() => setDeleteTarget(null)}>Hủy</button><button type="button" className="admin-voucher-delete-confirm" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Đang xóa…' : 'Xóa voucher'}</button></div></section></div>}

    {detail && <div className="admin-voucher-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null) }}><section className="admin-voucher-detail" role="dialog" aria-modal="true" aria-labelledby="voucher-detail-title">
      <header className="admin-voucher-detail__header"><button type="button" aria-label="Đóng" onClick={() => setDetail(null)}>×</button></header>
      {detailLoading ? <div className="admin-brand-state">Đang tải thông tin voucher…</div> : <div className="admin-voucher-detail__content">
        {imageOf(detail) ? <img className="admin-voucher-detail__image" src={imageOf(detail)} alt={detail.title || detail.code} /> : <div className="admin-voucher-detail__image admin-voucher-detail__image--empty">🎟️</div>}
        <h2 className="admin-voucher-detail__title" id="voucher-detail-title">{detail.title || 'Voucher'}</h2>
        <div className="admin-voucher-detail__accent" />
        <section className="admin-voucher-detail__body"><p>{detail.body || 'Chưa có nội dung.'}</p></section>
        {canWrite && <button type="button" className="admin-brand-add" onClick={() => openEdit(detail)}>Sửa voucher</button>}
      </div>}
    </section></div>}
  </section>
}

export default VoucherManagement
