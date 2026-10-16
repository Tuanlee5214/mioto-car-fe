import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import FeatureIcon from '../../components/ui/FeatureIcon/FeatureIcon'
import { buildApiUrl } from '../../constants/api'
import { getCarBrands } from '../../services/carBrandService'
import { getDistricts } from '../../services/districtService'
import { getFeatures } from '../../services/featureService'
import { getProvinces } from '../../services/provinceService'
import { addCarFeatures, addCarImages, createCar, createCarUnavail, deleteCarUnavail, getCarUnavails, getMyCars, getAdminCarById, removeCarFeatures, removeCarImages, updateCar, uploadCarImage } from '../../services/carService'
import { getCarFeatureItems } from '../../utils/carFeatures'
import CarBrandIcon from '../../components/ui/CarBrandIcon/CarBrandIcon'
import '../../pages/AdminPage/AdminPage.css'
import './MyCarsPage.css'
import './MyCarsOverrides.css'

const currentYear = new Date().getFullYear()
const blankForm = { carName: '', productionYear: currentYear, carBrandId: '', provinceId: '', districtId: '', numSeats: 5, transmission: 1, typeFuel: 1, fuelConsumption: '', pricePerDay: '', description: '', policy: '', features: [] }
const idOf = (item) => item?.carBrandId ?? item?.brandId ?? item?.id
const brandNameOf = (brand) => brand?.nameBrand ?? brand?.brandName ?? brand?.name ?? ''
const provinceIdOf = (item) => item?.provinceId ?? item?.id
const provinceNameOf = (item) => item?.provinceName ?? item?.nameProvince ?? item?.name ?? ''
const districtIdOf = (item) => item?.districtId ?? item?.id
const districtNameOf = (item) => item?.districtName ?? item?.nameDistrict ?? item?.name ?? ''
const featureIdOf = (item) => item?.featureId ?? item?.id
const featureNameOf = (item) => {
  const name = item?.nameFeature ?? item?.featureName ?? item?.name ?? ''
  return name ? <span className="my-car-feature-label"><FeatureIcon iconKey={item?.iconKey} />{name}</span> : ''
}
const featureIdsOf = (car) => {
  const source = car?.features ?? car?.carFeatures ?? car?.featureList ?? car?.carFeatureList ?? []
  return (Array.isArray(source) ? source : []).map((feature) => {
    if (typeof feature === 'number' || typeof feature === 'string') return feature
    return featureIdOf(feature) ?? feature?.feature?.featureId ?? feature?.feature?.id
  }).filter((id) => id !== undefined && id !== null && id !== '').map(Number)
}
const carOf = (entry) => entry?.car ? { ...entry.car, districtId: entry.districtId ?? entry.car.districtId, provinceId: entry.provinceId ?? entry.car.provinceId, district: entry.district ?? entry.car.district, province: entry.province ?? entry.car.province, brandName: entry.brandName ?? entry.car.brandName, districtName: entry.districtName ?? entry.car.districtName, provinceName: entry.provinceName ?? entry.car.provinceName, imageUrl: entry.imageUrl, images: entry.images ?? entry.car.images ?? (entry.imageUrl ? [entry.imageUrl] : []), features: entry.features ?? entry.carFeatures ?? entry.car.features ?? entry.car.carFeatures ?? entry.featureList ?? entry.car.featureList ?? entry.carFeatureList ?? entry.car.carFeatureList } : entry
const carId = (car) => car?.carId ?? car?.id
const getCarImages = (car) => {
  const source = car?.images ?? car?.carImages ?? car?.imageUrls ?? car?.imageList ?? (car?.imageUrl ? [car.imageUrl] : [])
  return (Array.isArray(source) ? source : source ? [source] : []).map(imageSource).filter(Boolean)
}
const carStatus = (car) => {
  const status = Number(car?.status ?? car?.carStatus)
  return status === 1 ? { label: 'Đang hoạt động', className: 'active' } : status === 3 ? { label: 'Đã khóa', className: 'blocked' } : { label: 'Chờ duyệt', className: 'pending' }
}
const enumLabel = (value, options) => options[Number(value)] || '—'
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const unavailStart = (item) => Number(item?.startTime)
const unavailEnd = (item) => Number(item?.endTime)
const unavailId = (item) => item?.carUnavailId ?? item?.id
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const nextDateKey = (value = dateKey(new Date())) => {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + 1)
  return dateKey(date)
}
const localDateTimeValue = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
const nextAvailableMinute = () => {
  const date = new Date()
  date.setSeconds(0, 0)
  date.setMinutes(date.getMinutes() + 1)
  return date
}
function parseCarPrice(value) {
  const input = String(value ?? '').trim().replace(/\s/g, '')
  if (!input) return NaN
  const separators = [...input.matchAll(/[.,]/g)]
  if (!separators.length) return Number(input)

  const lastSeparator = separators.at(-1)[0]
  const decimalDigits = input.length - input.lastIndexOf(lastSeparator) - 1
  const hasBothSeparators = input.includes('.') && input.includes(',')
  const isDecimal = hasBothSeparators || decimalDigits === 1 || decimalDigits === 2
  if (!isDecimal) return Number(input.replace(/[.,]/g, ''))

  const decimalIndex = input.lastIndexOf(lastSeparator)
  const integerPart = input.slice(0, decimalIndex).replace(/[.,]/g, '')
  const decimalPart = input.slice(decimalIndex + 1)
  return Number(`${integerPart}.${decimalPart}`)
}
function UnavailCalendar({ records, onSelectDay, onExtendRange, onDragStart, onDragEnd, selectedStart, selectedEnd }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const today = new Date()
  const month = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
  const dayLabels = (dayStart, dayEnd) => records.filter((item) => unavailStart(item) < dayEnd && unavailEnd(item) > dayStart).map((item) => {
    const left = Math.max(0, (unavailStart(item) - dayStart) / 86400000 * 100)
    const right = Math.min(100, (unavailEnd(item) - dayStart) / 86400000 * 100)
    return { left, width: Math.max(0, right - left) }
  })
  const offset = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  while (cells.length % 7) cells.push(null)

  return <div className="my-car-calendar">
    <div className="my-car-calendar__legend"><span><i /> Thời gian xe bận</span><span><i className="is-past" /> Ngày đã qua</span></div>
    <div className="my-car-calendar__nav">
      <button type="button" onClick={() => setMonthOffset((offset) => offset - 1)}>‹ Tháng trước</button>
      <strong>Tháng {month.getMonth() + 1} năm {month.getFullYear()}</strong>
      <button type="button" onClick={() => setMonthOffset((offset) => offset + 1)}>Tháng sau ›</button>
    </div>
    <section className="my-car-calendar__month">
      <div className="my-car-calendar__grid">{weekdays.map((weekday) => <strong className="my-car-calendar__weekday" key={weekday}>{weekday}</strong>)}{cells.map((day, index) => {
        if (!day) return <div className="my-car-calendar__empty" key={`empty-${index}`} />
        const start = new Date(month.getFullYear(), month.getMonth(), day)
        const end = new Date(month.getFullYear(), month.getMonth(), day + 1)
        const past = end <= new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const segments = dayLabels(start.getTime(), end.getTime())
        const key = dateKey(start)
        const inSelection = selectedStart && selectedEnd && key >= selectedStart && key < selectedEnd
        const selectable = !past || segments.length > 0
        return <button type="button" key={key} className={`my-car-calendar__day${past ? ' is-past' : ''}${segments.length ? ' has-unavail' : ''}${inSelection ? ' is-selected' : ''}`} onPointerDown={() => { if (selectable) { onDragStart(); onSelectDay(start) } }} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} onClick={(event) => selectable && event.detail === 0 && onSelectDay(start)} onPointerEnter={(event) => !past && event.buttons === 1 && onExtendRange(start)} disabled={!selectable} aria-label={`${day}/${month.getMonth() + 1}${segments.length ? ', xe bận một phần hoặc cả ngày' : ''}`}><span>{day}</span>{segments.map((segment, segmentIndex) => <i key={segmentIndex} style={{ left: `${segment.left}%`, width: `${segment.width}%` }} />)}</button>
      })}</div>
    </section>
  </div>
}

function UnavailEditor({ open, startDate, endDate, onStartDateChange, onEndDateChange, selectedDate, selectedRecords, mode, onModeChange, startHour, setStartHour, endHour, setEndHour, error, onSave, onDelete, onClose, busy }) {
  const minimumStart = localDateTimeValue(nextAvailableMinute())
  if (!open || (!startDate && !selectedRecords.length)) return null
  const content = selectedRecords.length ? <div className="my-car-unavail-form">
    <div className="my-car-unavail-form__header"><h4>Khoảng bận ngày {selectedDate}</h4><button type="button" onClick={onClose} aria-label="Đóng">×</button></div>
    {error && <p className="my-car-unavail-error" role="alert">{error}</p>}
    <p className="my-car-unavail-hint">Chọn khoảng thời gian bên dưới nếu bạn muốn xóa lịch bận.</p>
    <div className="my-car-unavail-records">{selectedRecords.map((record, index) => <div className="my-car-unavail-record" key={unavailId(record) ?? index}>
      <span>{new Date(unavailStart(record)).toLocaleString('vi-VN')} – {new Date(unavailEnd(record)).toLocaleString('vi-VN')}</span>
      <button type="button" onClick={() => onDelete(record)} disabled={busy || unavailId(record) == null}>{busy ? 'Đang xóa…' : 'Xóa khoảng bận'}</button>
    </div>)}</div>
    <div className="my-car-unavail-form__actions"><button type="button" onClick={onClose} disabled={busy}>Đóng</button></div>
  </div> : <form className="my-car-unavail-form" onSubmit={onSave}>
    <div className="my-car-unavail-form__header"><h4>Khoảng đã chọn: {startDate}{endDate !== startDate ? ` – ${endDate}` : ''}</h4><button type="button" onClick={onClose} aria-label="Đóng">×</button></div>
    {error && <p className="my-car-unavail-error" role="alert">{error}</p>}
    <div className="my-car-unavail-form__modes"><label><input type="radio" name="unavail-mode" value="day" checked={mode === 'day'} onChange={() => onModeChange('day')}/> Bận theo ngày</label><label><input type="radio" name="unavail-mode" value="hour" checked={mode === 'hour'} onChange={() => onModeChange('hour')}/> Bận theo giờ</label></div>
    {mode === 'day' ? <>
      <div className="my-car-unavail-form__fields my-car-unavail-form__date-range">
        <label>Ngày bắt đầu<input type="date" min={nextDateKey()} value={startDate} onChange={(event) => onStartDateChange(event.target.value)} required/></label>
        <label>Ngày kết thúc<input type="date" min={nextDateKey(startDate)} value={endDate} onChange={(event) => onEndDateChange(event.target.value)} required/></label>
      </div>
      <p className="my-car-unavail-hint">Xe bận từ 00:00 ngày {startDate} đến 00:00 ngày {endDate}; ngày kết thúc không tính vào số ngày bận.</p>
    </> : <div className="my-car-unavail-form__fields"><label>Bắt đầu<input type="datetime-local" min={minimumStart} value={startHour} onChange={(event) => setStartHour(event.target.value)} required/></label><label>Kết thúc<input type="datetime-local" min={startHour > minimumStart ? startHour : minimumStart} value={endHour} onChange={(event) => setEndHour(event.target.value)} required/></label><small>Chọn giờ bắt đầu và kết thúc; có thể kéo dài sang ngày hôm sau hoặc nhiều ngày sau.</small></div>}
    <div className="my-car-unavail-form__actions"><button type="button" onClick={onClose} disabled={busy}>Hủy</button><button className="my-cars-primary" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu lịch bận'}</button></div>
  </form>
  return createPortal(<div className="my-car-unavail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><section role="dialog" aria-modal="true" aria-label="Chọn thời gian xe bận">{content}</section></div>, document.body)
}
function unavailsOnDate(records, value) {
  if (!value) return []
  const dayStart = new Date(`${value}T00:00:00`).getTime()
  return records.filter((item) => unavailStart(item) < dayStart + 86400000 && unavailEnd(item) > dayStart)
}
const imageSource = (image) => {
  const src = typeof image === 'string' ? image : image?.imageUrl ?? image?.url ?? image?.path ?? image?.publicId
  return src ? (/^(https?:|data:|blob:|\/\/)/i.test(src) ? src : buildApiUrl(src.startsWith('/') ? src : `/api/images/${src}`)) : ''
}
function DetailIcon({ type }) {
  const paths = {
    brand: <><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="5"/></>,
    year: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m3 0h2m-7 3h2"/></>,
    seats: <><circle cx="9" cy="8" r="2.5"/><circle cx="17" cy="9" r="2"/><path d="M4 19a5 5 0 0 1 10 0m1-4a4 4 0 0 1 5 4"/></>,
    gear: <><path d="M8 4v7a4 4 0 0 0 4 4h2a3 3 0 0 1 3 3v2"/><circle cx="8" cy="4" r="2"/><path d="M8 9H5m3 0h3"/></>,
    fuel: <><path d="M12 3c2.2 3.2 5.5 6.7 5.5 11a5.5 5.5 0 0 1-11 0C6.5 9.7 9.8 6.2 12 3Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5"/></>,
    price: <><path d="M12 3v18m5-14H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></>,
    description: <><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v5h5M9 13h6m-6 4h6"/></>,
    policy: <><path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  }
  return <svg className="admin-car-detail-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[type] || paths.brand}</svg>
}

function MyCarsPage() {
  const [cars, setCars] = useState([])
  const [brands, setBrands] = useState([])
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [imageEntries, setImageEntries] = useState([])
  const imageEntriesRef = useRef([])
  const [uploadingImages, setUploadingImages] = useState(0)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)
  const [brandError, setBrandError] = useState('')
  const [provinceError, setProvinceError] = useState('')
  const [districtError, setDistrictError] = useState('')
  const [featureError, setFeatureError] = useState('')
  const [districtLoading, setDistrictLoading] = useState(false)
  const [featureLoading, setFeatureLoading] = useState(true)
  const [cardImageIndexes, setCardImageIndexes] = useState({})
  const [detailImageIndex, setDetailImageIndex] = useState(0)
  const [managementTab, setManagementTab] = useState('details')
  const [managedFeatureIds, setManagedFeatureIds] = useState([])
  const [managedFeatureRecordIds, setManagedFeatureRecordIds] = useState([])
  const [managedImages, setManagedImages] = useState([])
  const [managementSelection, setManagementSelection] = useState([])
  const [managementBusy, setManagementBusy] = useState(false)
  const [managementUploadCount, setManagementUploadCount] = useState(0)
  const [managementFileInputKey, setManagementFileInputKey] = useState(0)
  const [carUnavails, setCarUnavails] = useState([])
  const [unavailError, setUnavailError] = useState('')
  const [unavailLoading, setUnavailLoading] = useState(false)
  const [unavailMode, setUnavailMode] = useState('day')
  const [unavailStartDate, setUnavailStartDate] = useState('')
  const [unavailEndDate, setUnavailEndDate] = useState('')
  const [unavailSelectedDate, setUnavailSelectedDate] = useState('')
  const [unavailAnchorDate, setUnavailAnchorDate] = useState('')
  const [unavailPointerActive, setUnavailPointerActive] = useState(false)
  const [unavailStartHour, setUnavailStartHour] = useState('')
  const [unavailEndHour, setUnavailEndHour] = useState('')

  useEffect(() => {
    if (!unavailPointerActive) return undefined
    const endPointerSelection = () => setUnavailPointerActive(false)
    window.addEventListener('pointerup', endPointerSelection)
    window.addEventListener('pointercancel', endPointerSelection)
    return () => {
      window.removeEventListener('pointerup', endPointerSelection)
      window.removeEventListener('pointercancel', endPointerSelection)
    }
  }, [unavailPointerActive])

  const refreshCars = async () => {
    const result = await getMyCars()
    if (!result.success) throw new Error(result.message)
    setCars(result.data.map(carOf))
  }

  useEffect(() => {
    let active = true
    getMyCars().then((mine) => {
      if (!active) return
      if (!mine.success) { setError(mine.message); return }
      setCars(mine.data.map(carOf))
    }).catch((loadError) => { if (active) setError(loadError.message || 'Không thể tải danh sách xe.') })
      .finally(() => { if (active) setLoading(false) })
    getCarBrands({ count: 100, offset: 0 }).then((brandResult) => {
      if (!active) return
      if (brandResult.success) setBrands(brandResult.data)
      else setBrandError(brandResult.message || 'Không thể tải danh sách hiệu xe.')
    }).catch(() => { if (active) setBrandError('Không thể tải danh sách hiệu xe.') })
    const loadAll = async (fetchBatch, batchSize) => {
      const all = []
      let offset = 0
      while (active) {
        const result = await fetchBatch({ count: batchSize, offset })
        if (!result.success) throw new Error(result.message)
        all.push(...result.data)
        if (result.data.length < batchSize) break
        offset += result.data.length
      }
      return all
    }
    loadAll(getProvinces, 100).then((items) => { if (active) setProvinces(items) })
      .catch((loadError) => { if (active) setProvinceError(loadError.message || 'Không thể tải danh sách tỉnh thành.') })
    loadAll(getFeatures, 20).then((items) => { if (active) setFeatures(items) })
      .catch((loadError) => { if (active) setFeatureError(loadError.message || 'Không thể tải danh sách tính năng xe.') })
      .finally(() => { if (active) setFeatureLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!form.provinceId) { setDistricts([]); setDistrictError(''); setDistrictLoading(false); return () => { active = false } }
    setDistrictLoading(true)
    const loadDistrictOptions = async () => {
      const all = []
      let offset = 0
      const count = 100
      while (active) {
        const result = await getDistricts(form.provinceId, { count, offset })
        if (!result.success) throw new Error(result.message)
        all.push(...result.data)
        if (result.data.length < count) break
        offset += result.data.length
      }
      if (active) { setDistricts(all); setDistrictError('') }
    }
    loadDistrictOptions().catch((loadError) => { if (active) { setDistricts([]); setDistrictError(loadError.message || 'Không thể tải danh sách quận huyện.') } }).finally(() => { if (active) setDistrictLoading(false) })
    return () => { active = false }
  }, [form.provinceId])

  useEffect(() => {
    if (!notification) return undefined
    const timer = window.setTimeout(() => setNotification(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notification])

  useEffect(() => () => {
    imageEntriesRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
  }, [])

  const replaceImages = (nextImages) => {
    imageEntriesRef.current = nextImages
    setImageEntries(nextImages)
  }
  const openCreate = () => {
    imageEntriesRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    replaceImages([])
    setUploadingImages(0)
    setForm(blankForm)
    setDialog({ mode: 'create' })
  }
  const handleImageSelection = async (event) => {
    const input = event.currentTarget
    const selected = Array.from(input.files || [])
    input.value = ''
    const remaining = Math.max(0, 5 - imageEntriesRef.current.length)
    const accepted = selected.slice(0, remaining)
    if (selected.length > accepted.length) setNotification({ type: 'error', message: 'Bạn chỉ có thể tải tối đa 5 ảnh cho mỗi xe.' })
    if (!accepted.length) return

    const newEntries = accepted.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      publicId: '',
      uploading: true,
      error: '',
    }))
    replaceImages([...imageEntriesRef.current, ...newEntries])
    setUploadingImages((count) => count + newEntries.length)

    for (const entry of newEntries) {
      try {
        const result = await uploadCarImage(entry.file)
        if (!result.success) throw new Error(result.message)
        imageEntriesRef.current = imageEntriesRef.current.map((image) => image.id === entry.id ? { ...image, publicId: result.data, uploading: false } : image)
      } catch (uploadError) {
        imageEntriesRef.current = imageEntriesRef.current.map((image) => image.id === entry.id ? { ...image, uploading: false, error: uploadError.message || 'Tải ảnh thất bại.' } : image)
        setNotification({ type: 'error', message: `${entry.file.name}: ${uploadError.message || 'Tải ảnh thất bại.'}` })
      } finally {
        setImageEntries([...imageEntriesRef.current])
        setUploadingImages((count) => Math.max(0, count - 1))
      }
    }
  }
  const removeImage = (imageId) => {
    const removed = imageEntriesRef.current.find((image) => image.id === imageId)
    if (removed) URL.revokeObjectURL(removed.previewUrl)
    replaceImages(imageEntriesRef.current.filter((image) => image.id !== imageId))
  }
  const openDetail = async (car) => {
    setDetailImageIndex(0)
    setManagementTab('details'); setManagementSelection([])
    setUnavailStartDate(''); setUnavailEndDate(''); setUnavailSelectedDate(''); setUnavailAnchorDate('')
    setUnavailError(''); setUnavailMode('day')
    setDialog({ mode: 'manage', loading: true, car })
    try {
      const result = await getAdminCarById(carId(car))
      if (!result.success) throw new Error(result.message)
      const payload = result.data?.car ? result.data : result.data?.item || result.data
      const detailedCar = carOf(payload)
      const rawFeatures = detailedCar.features ?? detailedCar.carFeatures ?? detailedCar.featureList ?? detailedCar.carFeatureList ?? []
      const featureRecords = Array.isArray(rawFeatures) ? rawFeatures : []
      setManagedFeatureIds(featureRecords.map((item) => Number(typeof item === 'object' ? item.featureId ?? item.feature?.featureId ?? item.feature?.id : item)).filter(Number.isFinite))
      setManagedFeatureRecordIds(featureRecords.map((item) => { const id = Number(typeof item === 'object' ? item.id ?? item.carFeatureId : NaN); return Number.isFinite(id) ? id : null }))
      const rawImages = detailedCar.images ?? detailedCar.carImages ?? detailedCar.imageList ?? []
      setManagedImages((Array.isArray(rawImages) ? rawImages : []).map((item) => typeof item === 'string' ? { publicId: item } : item))
      const unavailResult = await getCarUnavails(carId(detailedCar))
      if (!unavailResult.success) { setUnavailError(unavailResult.message); setCarUnavails([]) }
      else { setUnavailError(''); setCarUnavails(unavailResult.data.filter((item) => Number(item.carId) === Number(carId(detailedCar)))) }
      setDialog({ mode: 'manage', loading: false, car: detailedCar })
    } catch (detailError) { setDialog({ mode: 'manage', loading: false, error: detailError.message }) }
  }

  const selectUnavailDay = (date) => {
    const value = dateKey(date)
    setUnavailError('')
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const dayEnd = dayStart + 86400000
    const recordsForDay = carUnavails.filter((item) => unavailStart(item) < dayEnd && unavailEnd(item) > dayStart)
    if (recordsForDay.length) {
      setUnavailSelectedDate(value)
      setUnavailStartDate('')
      setUnavailEndDate('')
      setUnavailAnchorDate('')
      return
    }
    setUnavailSelectedDate('')
    setUnavailAnchorDate(value)
    setUnavailStartDate(value)
    setUnavailEndDate(nextDateKey(value))
    setUnavailError('')
    const isToday = value === dateKey(new Date())
    setUnavailMode(isToday ? 'hour' : 'day')
    const start = isToday ? nextAvailableMinute() : new Date(`${value}T09:00`)
    setUnavailStartHour(localDateTimeValue(start))
    setUnavailEndHour(localDateTimeValue(new Date(start.getTime() + 60 * 60 * 1000)))
  }

  const changeUnavailStartDate = (value) => {
    setUnavailStartDate(value)
    setUnavailAnchorDate(value)
    setUnavailEndDate((end) => end <= value ? nextDateKey(value) : end)
    setUnavailError('')
  }

  const changeUnavailMode = (mode) => {
    setUnavailMode(mode)
    setUnavailError('')
    const today = dateKey(new Date())
    if (mode === 'day') {
      const start = unavailStartDate <= today ? nextDateKey() : unavailStartDate
      const end = unavailEndDate <= start ? nextDateKey(start) : unavailEndDate
      setUnavailStartDate(start)
      setUnavailEndDate(end)
      setUnavailAnchorDate(start)
      return
    }
    const start = unavailStartDate === today ? localDateTimeValue(nextAvailableMinute()) : `${unavailStartDate}T${unavailStartHour.slice(11) || '09:00'}`
    const end = `${unavailEndDate}T${unavailEndHour.slice(11) || '10:00'}`
    setUnavailStartHour(start)
    setUnavailEndHour(new Date(end).getTime() > new Date(start).getTime() ? end : localDateTimeValue(new Date(new Date(start).getTime() + 60 * 60 * 1000)))
  }

  const changeUnavailEndDate = (value) => {
    setUnavailEndDate(value)
    setUnavailError('')
  }

  const extendUnavailRange = (date) => {
    if (!unavailAnchorDate) return
    const target = dateKey(date)
    const anchor = new Date(`${unavailAnchorDate}T00:00:00`)
    const targetDate = new Date(`${target}T00:00:00`)
    const direction = target >= unavailAnchorDate ? 1 : -1
    let cursor = new Date(anchor)
    let lastAllowed = unavailAnchorDate
    while (direction > 0 ? cursor <= targetDate : cursor >= targetDate) {
      const value = dateKey(cursor)
      const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime()
      const isBlocked = carUnavails.some((item) => unavailStart(item) < dayStart + 86400000 && unavailEnd(item) > dayStart)
      if (value !== unavailAnchorDate && isBlocked) break
      lastAllowed = value
      cursor.setDate(cursor.getDate() + direction)
    }
    const startDate = lastAllowed < unavailAnchorDate ? lastAllowed : unavailAnchorDate
    const endDate = nextDateKey(lastAllowed)
    const includesToday = startDate <= dateKey(new Date()) && endDate > dateKey(new Date())
    setUnavailStartDate(startDate)
    setUnavailEndDate(endDate)
    setUnavailError('')
    if (includesToday) setUnavailMode('hour')
    const startDateTime = startDate === dateKey(new Date())
      ? localDateTimeValue(nextAvailableMinute())
      : `${startDate}T${unavailStartHour?.slice(11) || '09:00'}`
    const endDateTime = `${endDate}T${unavailEndHour?.slice(11) || '10:00'}`
    const startTime = new Date(startDateTime).getTime()
    const endTime = new Date(endDateTime).getTime()
    setUnavailStartHour(startDateTime)
    setUnavailEndHour(endTime > startTime ? endDateTime : localDateTimeValue(new Date(startTime + 60 * 60 * 1000)))
  }

  const saveCarUnavail = async (event) => {
    event.preventDefault()
    if (!dialog?.car) return
    let startTime
    let endTime
    if (unavailMode === 'day') {
      if (!unavailStartDate || !unavailEndDate || unavailEndDate <= unavailStartDate) {
        setUnavailError('Vui lòng chọn khoảng ngày hợp lệ.')
        return
      }
      if (unavailStartDate <= dateKey(new Date())) {
        setUnavailError('Không thể đặt bận trọn ngày hôm nay vì thời gian trong ngày đã qua. Hãy chọn bận theo giờ.')
        setUnavailMode('hour')
        return
      }
      startTime = new Date(`${unavailStartDate}T00:00:00`).getTime()
      endTime = new Date(`${unavailEndDate}T00:00:00`).getTime()
    } else {
      startTime = new Date(unavailStartHour).getTime()
      endTime = new Date(unavailEndHour).getTime()
      if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        setUnavailError('Giờ kết thúc phải sau giờ bắt đầu.')
        return
      }
      if (startTime < Date.now()) {
        setUnavailError('Giờ bắt đầu không được ở quá khứ. Hãy chọn thời gian từ bây giờ trở đi.')
        return
      }
    }
    if (carUnavails.some((item) => startTime < unavailEnd(item) && endTime > unavailStart(item))) {
      setUnavailError('Khoảng thời gian này trùng với lịch bận đã có.')
      return
    }
    setUnavailLoading(true)
    try {
      const result = await createCarUnavail(carId(dialog.car), startTime, endTime)
      if (!result.success) throw new Error(result.message)
      const refreshed = await getCarUnavails(carId(dialog.car))
      if (!refreshed.success) throw new Error(refreshed.message)
      setCarUnavails(refreshed.data.filter((item) => Number(item.carId) === Number(carId(dialog.car))))
      setUnavailStartDate(''); setUnavailEndDate(''); setUnavailAnchorDate('')
      setUnavailSelectedDate('')
      setUnavailError('')
      setNotification({ type: 'success', message: 'Đã cập nhật lịch bận của xe.' })
    } catch (actionError) {
      setUnavailError(actionError.message || 'Không thể tải lại lịch bận.')
    } finally { setUnavailLoading(false) }
  }

  const deleteSelectedCarUnavail = async (record) => {
    const recordId = unavailId(record)
    if (!dialog?.car || recordId == null) return
    setUnavailLoading(true)
    try {
      const result = await deleteCarUnavail(carId(dialog.car), recordId)
      if (!result.success) throw new Error(result.message)
      const refreshed = await getCarUnavails(carId(dialog.car))
      if (!refreshed.success) throw new Error(refreshed.message)
      setCarUnavails(refreshed.data.filter((item) => Number(item.carId) === Number(carId(dialog.car))))
      setUnavailSelectedDate('')
      setUnavailError('')
      setNotification({ type: 'success', message: 'Đã xóa khoảng thời gian bận.' })
    } catch (actionError) {
      setUnavailError(actionError.message || 'Không thể xóa lịch bận.')
    } finally { setUnavailLoading(false) }
  }

  const closeUnavailEditor = () => {
    setUnavailStartDate('')
    setUnavailEndDate('')
    setUnavailSelectedDate('')
    setUnavailAnchorDate('')
    setUnavailError('')
  }

  const refreshManagedCar = async () => {
    const result = await getAdminCarById(carId(dialog.car))
    if (!result.success) throw new Error(result.message)
    const payload = result.data?.car ? result.data : result.data?.item || result.data
    const detailedCar = carOf(payload)
    const rawFeatures = detailedCar.features ?? detailedCar.carFeatures ?? detailedCar.featureList ?? detailedCar.carFeatureList ?? []
    const featureRecords = Array.isArray(rawFeatures) ? rawFeatures : []
    setManagedFeatureIds(featureRecords.map((item) => Number(typeof item === 'object' ? item.featureId ?? item.feature?.featureId ?? item.feature?.id : item)).filter(Number.isFinite))
    setManagedFeatureRecordIds(featureRecords.map((item) => { const id = Number(typeof item === 'object' ? item.id ?? item.carFeatureId : NaN); return Number.isFinite(id) ? id : null }))
    const rawImages = detailedCar.images ?? detailedCar.carImages ?? detailedCar.imageList ?? []
    setManagedImages((Array.isArray(rawImages) ? rawImages : []).map((item) => typeof item === 'string' ? { publicId: item } : item))
    setDialog((current) => ({ ...current, car: detailedCar }))
  }

  const saveManagedFeatures = async (action) => {
    if (!managementSelection.length) return
    setManagementBusy(true)
    try {
      const result = action === 'add'
        ? await addCarFeatures(carId(dialog.car), managementSelection.filter((id) => id < 0).map((id) => Math.abs(id)))
        : await removeCarFeatures(carId(dialog.car), managementSelection.filter((id) => id > 0))
      if (!result.success) throw new Error(result.message)
      setManagementSelection([])
      await refreshManagedCar()
      await refreshCars()
      setNotification({ type: 'success', message: action === 'add' ? 'Đã thêm tính năng cho xe.' : 'Đã xóa tính năng khỏi xe.' })
    } catch (actionError) { setNotification({ type: 'error', message: actionError.message || 'Không thể cập nhật tính năng xe.' }) }
    finally { setManagementBusy(false) }
  }

  const handleManagedImageSelection = async (event) => {
    const input = event.currentTarget
    const selected = Array.from(input.files || [])
    input.value = ''
    const remaining = Math.max(0, 5 - managedImages.length)
    const accepted = selected.slice(0, remaining)
    if (accepted.length < selected.length) setNotification({ type: 'error', message: `Xe chỉ được có tối đa 5 ảnh. Hiện còn chỗ cho ${remaining} ảnh.` })
    if (!accepted.length) return
    setManagementUploadCount(accepted.length)
    setManagementBusy(true)
    try {
      const publicIds = []
      for (const file of accepted) {
        const result = await uploadCarImage(file)
        if (!result.success) throw new Error(`${file.name}: ${result.message}`)
        publicIds.push(result.data)
        setManagementUploadCount((count) => count - 1)
      }
      const result = await addCarImages(carId(dialog.car), publicIds)
      if (!result.success) throw new Error(result.message)
      await refreshManagedCar()
      await refreshCars()
      setNotification({ type: 'success', message: `Đã thêm ${publicIds.length} ảnh cho xe.` })
    } catch (uploadError) { setNotification({ type: 'error', message: uploadError.message || 'Không thể thêm ảnh cho xe.' }) }
    finally { setManagementUploadCount(0); setManagementBusy(false); setManagementFileInputKey((key) => key + 1) }
  }

  const deleteManagedImage = async (image) => {
    const imageId = image?.id ?? image?.carImageId
    if (imageId == null) { setNotification({ type: 'error', message: 'Không tìm thấy ID ảnh để xóa. Hãy tải lại thông tin xe.' }); return }
    setManagementBusy(true)
    try {
      const result = await removeCarImages(carId(dialog.car), [imageId])
      if (!result.success) throw new Error(result.message)
      await refreshManagedCar()
      await refreshCars()
      setNotification({ type: 'success', message: 'Đã xóa ảnh khỏi xe.' })
    } catch (deleteError) { setNotification({ type: 'error', message: deleteError.message || 'Không thể xóa ảnh.' }) }
    finally { setManagementBusy(false) }
  }
  const openEdit = async (car) => {
    setDialog({ mode: 'edit', loading: true, car })
    let editableCar = car
    try {
      const result = await getAdminCarById(carId(car))
      if (result.success) {
        const payload = result.data?.car ? result.data : result.data?.item || result.data
        editableCar = carOf(payload)
      }
    } catch { /* Keep the list data available if the detail request fails. */ }
    const provinceByName = provinces.find((province) => provinceNameOf(province).trim().toLocaleLowerCase() === String(editableCar.provinceName || '').trim().toLocaleLowerCase())
    const initial = {
      ...blankForm,
      ...editableCar,
      provinceId: editableCar.provinceId ?? editableCar.province?.provinceId ?? editableCar.district?.provinceId ?? provinceIdOf(provinceByName) ?? '',
      districtId: editableCar.districtId ?? editableCar.district?.districtId ?? '',
      features: featureIdsOf(editableCar),
    }
    setForm(initial)
    setDialog({ mode: 'edit', car: editableCar })
  }
  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => name === 'provinceId' ? { ...current, provinceId: value, districtId: '' } : { ...current, [name]: value })
    if (name === 'provinceId') setDistrictError('')
  }
  const toggleFeature = (featureId) => setForm((current) => {
    const selected = current.features.map(Number)
    const id = Number(featureId)
    return { ...current, features: selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id] }
  })
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      if (dialog.mode === 'create' && uploadingImages > 0) throw new Error('Đợi ảnh tải xong rồi hãy tạo xe.')
      if (dialog.mode === 'create' && imageEntries.some((image) => !image.publicId)) throw new Error('Có ảnh chưa tải thành công. Hãy xóa ảnh lỗi rồi thử lại.')
      if (!form.districtId) throw new Error('Vui lòng chọn quận huyện.')
      const pricePerDay = parseCarPrice(form.pricePerDay)
      if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) throw new Error('Vui lòng nhập giá thuê mỗi ngày hợp lệ.')
      const payload = {
        carName: form.carName,
        productionYear: Number(form.productionYear),
        carBrandId: Number(form.carBrandId),
        numSeats: Number(form.numSeats),
        transmission: Number(form.transmission),
        typeFuel: Number(form.typeFuel),
        fuelConsumption: Number(String(form.fuelConsumption).replace(',', '.')),
        pricePerDay,
        districtId: Number(form.districtId),
        description: form.description,
        policy: form.policy,
      }
      const result = dialog.mode === 'create'
        ? await createCar({ ...payload, images: imageEntries.map(({ publicId }) => ({ publicId })), features: form.features.map(Number) })
        : await updateCar(carId(dialog.car), payload)
      if (!result.success) throw new Error(result.message)
      await refreshCars()
      setDialog(null); setNotification({ type: 'success', message: dialog.mode === 'create' ? 'Đã đăng ký xe thành công.' : 'Đã cập nhật thông tin xe.' })
    } catch (saveError) { setNotification({ type: 'error', message: saveError.message || 'Không thể lưu xe.' }) }
    finally { setSaving(false) }
  }

  const brandForCar = (car) => brands.find((brand) => String(idOf(brand)) === String(car.carBrandId))
  const brandName = (car) => car.brandName || brandNameOf(brandForCar(car)) || 'Chưa rõ hãng'
  const brandIconKey = (car) => car.carBrand?.iconKey
    ?? car.brand?.iconKey
    ?? (car.carBrandId == null ? '' : brandForCar(car)?.iconKey)
  const status = dialog?.car ? carStatus(dialog.car) : null
  const carImages = useMemo(() => dialog?.mode === 'manage' ? managedImages.map(imageSource).filter(Boolean) : getCarImages(dialog?.car), [dialog, managedImages])

  return <main className="my-cars-page">
    {notification && <div className={`admin-brand-toast admin-brand-toast--${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}><span className="admin-brand-toast__icon" aria-hidden="true">{notification.type === 'error' ? '!' : '✓'}</span><p>{notification.message}</p><button type="button" aria-label="Đóng thông báo" onClick={() => setNotification(null)}>×</button></div>}
    <header className="my-cars-header"><Link className="my-cars-brand" to="/"><span>M</span> mioto</Link><Link to="/">← Trang chủ</Link></header>
    <section className="my-cars-content">
      <div className="my-cars-heading"><div><span className="my-cars-eyebrow">QUẢN LÝ TÀI SẢN</span><h1>Xe của tôi</h1><p>Theo dõi và cập nhật thông tin những chiếc xe bạn đăng cho thuê.</p></div>{cars.length > 0 && <button className="my-cars-primary" onClick={openCreate}>＋ Thêm xe mới</button>}</div>
      {error && <div className="my-cars-error" role="alert">{error}<button onClick={() => { setError(''); setLoading(true); refreshCars().catch((e) => setError(e.message)).finally(() => setLoading(false)) }}>Thử lại</button>{cars.length === 0 && <button onClick={openCreate}>Đăng ký xe</button>}</div>}
      <div className="my-cars-list-scroll">
      {loading ? <div className="my-cars-state">Đang tải danh sách xe…</div> : cars.length === 0 ? <section className="my-cars-empty"><div className="my-cars-empty-icon" aria-hidden="true">🚘</div><h2>Bạn chưa có xe nào</h2><p>Đăng ký chiếc xe đầu tiên để bắt đầu chia sẻ hành trình cùng Mioto.</p><button className="my-cars-primary" onClick={openCreate}>Đăng ký làm chủ xe</button></section> : <div className="admin-car-grid">{cars.map((car, index) => {
        const id = carId(car)
        const carName = car.carName || `Xe #${id ?? index + 1}`
        const images = getCarImages(car)
        const imageIndex = (cardImageIndexes[id] || 0) % Math.max(images.length, 1)
        const status = carStatus(car)
        const changeImage = (event, direction) => {
          event.stopPropagation()
          setCardImageIndexes((current) => ({ ...current, [id]: (imageIndex + direction + images.length) % images.length }))
        }
        return <article className="admin-car-card" key={id ?? index}>
          <div className="admin-car-card__cover">
            <button className="admin-car-card__photo" type="button" onClick={() => openDetail(car)} aria-label={`Xem chi tiết ${carName}`}>
              {images.length ? <img src={images[imageIndex]} alt={`${carName} — ảnh ${imageIndex + 1}`} loading="lazy" /> : <span className="admin-car-card__empty-photo" aria-hidden="true">🚘</span>}
            </button>
            <span className={`admin-car-status admin-car-status--${status.className}`}>{status.label}</span>
            {images.length > 1 && <>
              <button className="admin-car-card__arrow admin-car-card__arrow--prev" type="button" onClick={(event) => changeImage(event, -1)} aria-label="Ảnh trước">‹</button>
              <button className="admin-car-card__arrow admin-car-card__arrow--next" type="button" onClick={(event) => changeImage(event, 1)} aria-label="Ảnh tiếp theo">›</button>
              <span className="admin-car-card__photo-count">{imageIndex + 1} / {images.length}</span>
            </>}
          </div>
          <div className="admin-car-card__body">
            <div className="admin-car-card__title-row"><div className="admin-car-card__title"><h3>{carName}</h3><p><CarBrandIcon iconKey={brandIconKey(car)} className="car-brand-icon--vehicle" /><span className="admin-car-card__brand-name">{brandName(car)}</span><span>·</span><span className="admin-car-card__year">{car.productionYear || '—'}</span></p></div><div className="admin-car-card__price"><strong>{money(car.pricePerDay)}</strong><span>/ ngày</span></div></div>
            <div className="admin-car-card__specs">
              <span><b aria-hidden="true"><DetailIcon type="seats" /></b>{car.numSeats ? `${car.numSeats} chỗ` : '—'}</span>
              <span><b aria-hidden="true"><DetailIcon type="gear" /></b>{enumLabel(car.transmission, { 1: 'Số tự động', 2: 'Số sàn' })}</span>
              <span><b aria-hidden="true"><DetailIcon type="fuel" /></b>{enumLabel(car.typeFuel, { 1: 'Xăng', 2: 'Dầu diesel', 3: 'Điện' })}</span>
            </div>
            <div className="admin-car-card__location"><span aria-hidden="true"><DetailIcon type="location" /></span>{[car.districtName, car.provinceName].filter(Boolean).join(', ') || 'Chưa cập nhật địa điểm'}</div>
            <div className="admin-car-card__actions"><button className="admin-car-status-button" type="button" onClick={() => openDetail(car)}>Quản lý xe</button><button className="admin-car-status-button" type="button" onClick={() => openEdit(car)}>Sửa thông tin</button></div>
          </div>
        </article>
      })}</div>}
      </div>
    </section>
    {dialog && <div className={dialog.mode === 'manage' ? 'admin-car-detail-backdrop' : 'my-cars-backdrop'} onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && uploadingImages === 0 && !managementBusy) setDialog(null) }}><section className={dialog.mode === 'manage' ? 'admin-car-detail-modal' : 'my-cars-dialog'} role="dialog" aria-modal="true" aria-labelledby="my-cars-dialog-title">{dialog.mode === 'manage' ? <>
      <header className="admin-car-detail__header"><span className="admin-car-detail__header-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="m8 25 3.2-9.2a4 4 0 0 1 3.8-2.7h18a4 4 0 0 1 3.8 2.7L40 25v11h-4v-4H12v4H8V25Z"/><path d="M11 25h26M15 18h18M13 28h4m14 0h4"/></svg></span><div className="admin-car-detail__header-copy"><span className="admin-module-card__eyebrow">QUẢN LÝ XE #{carId(dialog.car) ?? ''}</span><h2 id="my-cars-dialog-title">{dialog.car?.carName || 'Quản lý xe'}</h2>{dialog.car && <span className={`admin-car-status admin-car-status--${status.className}`}>{status.label}</span>}</div><button type="button" className="admin-car-detail__close" aria-label="Đóng" onClick={() => setDialog(null)}>×</button></header>
      {dialog.loading ? <div className="admin-car-detail__state">Đang tải thông tin xe…</div> : dialog.error ? <div className="admin-car-detail__state admin-car-detail__state--error" role="alert">{dialog.error}</div> : <><nav className="my-car-management-tabs" aria-label="Quản lý xe"><button type="button" className={managementTab === 'details' ? 'is-active' : ''} onClick={() => setManagementTab('details')}>Chi tiết xe</button><button type="button" className={managementTab === 'features' ? 'is-active' : ''} onClick={() => { setManagementTab('features'); setManagementSelection([]) }}>Quản lý tính năng</button><button type="button" className={managementTab === 'images' ? 'is-active' : ''} onClick={() => { setManagementTab('images'); setManagementSelection([]) }}>Quản lý ảnh</button><button type="button" className={managementTab === 'availability' ? 'is-active' : ''} onClick={() => { setManagementTab('availability'); setManagementSelection([]) }}>Thời gian xe</button></nav>{managementTab === 'details' ? <div className="admin-car-detail__content">
        <section className="admin-car-gallery" aria-label="Thư viện ảnh xe"><div className="admin-car-gallery__heading"><h3>Hình ảnh xe</h3><span>{carImages.length} ảnh</span></div>{carImages.length ? <div className="admin-car-gallery__carousel"><img src={carImages[detailImageIndex % carImages.length]} alt={`${dialog.car.carName || 'Xe'} — ảnh ${detailImageIndex + 1}`} />{carImages.length > 1 && <><button type="button" aria-label="Ảnh trước" onClick={() => setDetailImageIndex((current) => (current - 1 + carImages.length) % carImages.length)}>‹</button><button type="button" aria-label="Ảnh tiếp theo" onClick={() => setDetailImageIndex((current) => (current + 1) % carImages.length)}>›</button><span>{detailImageIndex + 1} / {carImages.length}</span></>}</div> : <div className="admin-car-gallery__empty"><span aria-hidden="true">▧</span>Xe chưa có ảnh</div>}</section>
        <div className="admin-car-detail__grid">
          <div><span><DetailIcon type="brand"/>Thương hiệu</span><strong><CarBrandIcon iconKey={brandIconKey(dialog.car)} />{brandName(dialog.car)}</strong></div><div><span><DetailIcon type="year"/>Năm sản xuất</span><strong>{dialog.car.productionYear || '—'}</strong></div><div><span><DetailIcon type="seats"/>Số chỗ</span><strong>{dialog.car.numSeats ? `${dialog.car.numSeats} chỗ` : '—'}</strong></div><div><span><DetailIcon type="gear"/>Hộp số</span><strong>{enumLabel(dialog.car.transmission, { 1: 'Số tự động', 2: 'Số sàn' })}</strong></div><div><span><DetailIcon type="fuel"/>Nhiên liệu</span><strong>{enumLabel(dialog.car.typeFuel, { 1: 'Xăng', 2: 'Dầu diesel', 3: 'Điện' })}</strong></div><div><span><DetailIcon type="fuel"/>Mức tiêu hao</span><strong>{dialog.car.fuelConsumption ? `${dialog.car.fuelConsumption} / 100km` : '—'}</strong></div><div><span><DetailIcon type="price"/>Giá thuê mỗi ngày</span><strong>{money(dialog.car.pricePerDay)}</strong></div><div><span><DetailIcon type="location"/>Địa điểm</span><strong>{[dialog.car.districtName, dialog.car.provinceName].filter(Boolean).join(', ') || '—'}</strong></div>
        </div>
        <section className="admin-car-detail__text admin-car-detail__features"><h3><DetailIcon type="brand"/>Tính năng xe</h3>{getCarFeatureItems(dialog.car).length ? <div className="admin-car-feature-list">{getCarFeatureItems(dialog.car).map((feature, index) => <span key={feature.id ?? `${feature.name}-${index}`}><FeatureIcon iconKey={feature.iconKey} />{feature.name}</span>)}</div> : <p>Chưa cập nhật tính năng xe.</p>}</section>
        <section className="admin-car-detail__text"><h3><DetailIcon type="description"/>Mô tả xe</h3><p>{dialog.car.description || 'Chưa có mô tả.'}</p></section><section className="admin-car-detail__text"><h3><DetailIcon type="policy"/>Chính sách</h3><p>{dialog.car.policy || 'Chưa có chính sách.'}</p></section>
        <button className="admin-car-status-button" type="button" onClick={() => openEdit(dialog.car)}>Sửa thông tin xe</button>
      </div>
      : managementTab === 'features' ? <div className="my-car-management-panel">
        <div className="my-car-management-intro"><div><h3>Tính năng xe</h3><p>Thêm tính năng còn thiếu hoặc gỡ tính năng đang áp dụng.</p></div><span>{managedFeatureIds.length} tính năng</span></div>
        <div className="my-car-managed-list">{managedFeatureIds.length ? managedFeatureIds.map((featureId, index) => { const feature = features.find((item) => Number(featureIdOf(item)) === Number(featureId)); const recordId = managedFeatureRecordIds[index]; return <label key={`${featureId}-${recordId ?? index}`}><input type="checkbox" checked={managementSelection.includes(recordId)} disabled={recordId == null || managementBusy} onChange={() => setManagementSelection((current) => current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId])}/><span>{feature ? featureNameOf(feature) : `Tính năng #${featureId}`}</span><small>Đang áp dụng</small></label> }) : <p className="my-car-management-empty">Xe chưa có tính năng nào.</p>}</div>
        <div className="my-car-management-add"><h4>Thêm tính năng</h4>{featureLoading ? <p>Đang tải danh sách tính năng…</p> : featureError ? <p role="alert">{featureError}</p> : features.filter((feature) => !managedFeatureIds.includes(Number(featureIdOf(feature)))).length ? <div className="my-car-managed-list">{features.filter((feature) => !managedFeatureIds.includes(Number(featureIdOf(feature)))).map((feature, index) => { const id = Number(featureIdOf(feature)); return <label key={id ?? index}><input type="checkbox" checked={managementSelection.includes(-id)} disabled={managementBusy} onChange={() => setManagementSelection((current) => current.includes(-id) ? current.filter((item) => item !== -id) : [...current, -id])}/><span>{featureNameOf(feature) || `Tính năng ${id}`}</span></label> })}</div> : <p className="my-car-management-empty">Đã có đủ các tính năng trong danh sách.</p>}</div>
        <div className="my-car-management-actions"><button type="button" disabled={managementBusy || !managementSelection.some((id) => id > 0 && managedFeatureRecordIds.includes(id))} onClick={() => saveManagedFeatures('delete')}>Xóa đã chọn</button><button type="button" className="my-cars-primary" disabled={managementBusy || !managementSelection.some((id) => id < 0)} onClick={() => saveManagedFeatures('add')}>{managementBusy ? 'Đang lưu…' : 'Thêm đã chọn'}</button></div>
      </div>
      : managementTab === 'availability' ? <div className="my-car-management-panel">
        <div className="my-car-management-intro"><div><h3>Lịch bận của xe</h3><p>Chọn ngày, rồi kéo qua các ngày để chọn khoảng cần đặt bận.</p></div><span>{carUnavails.length} khoảng bận</span></div>
        <UnavailEditor open={!unavailPointerActive} startDate={unavailStartDate} endDate={unavailEndDate} onStartDateChange={changeUnavailStartDate} onEndDateChange={changeUnavailEndDate} selectedDate={unavailSelectedDate} selectedRecords={unavailsOnDate(carUnavails, unavailSelectedDate)} mode={unavailMode} onModeChange={changeUnavailMode} startHour={unavailStartHour} setStartHour={setUnavailStartHour} endHour={unavailEndHour} setEndHour={setUnavailEndHour} error={unavailError} onSave={saveCarUnavail} onDelete={deleteSelectedCarUnavail} onClose={closeUnavailEditor} busy={unavailLoading}/>
        <UnavailCalendar records={carUnavails} onSelectDay={selectUnavailDay} onExtendRange={extendUnavailRange} onDragStart={() => setUnavailPointerActive(true)} onDragEnd={() => setUnavailPointerActive(false)} selectedStart={unavailStartDate} selectedEnd={unavailEndDate}/>
      </div>
      : <div className="my-car-management-panel">
        <div className="my-car-management-intro"><div><h3>Ảnh xe</h3><p>Quản lý thư viện ảnh của xe. Tối đa 5 ảnh.</p></div><span>{managedImages.length}/5 ảnh</span></div>
        <label className={`my-car-image-upload ${managedImages.length >= 5 || managementBusy ? 'is-disabled' : ''}`}><input key={managementFileInputKey} type="file" accept="image/*" multiple disabled={managedImages.length >= 5 || managementBusy} onChange={handleManagedImageSelection}/><span aria-hidden="true">＋</span><strong>Thêm ảnh mới</strong><small>{managementUploadCount ? `Đang tải ảnh lên… (${managementUploadCount} còn lại)` : 'Chọn ảnh từ thiết bị của bạn'}</small></label>
        <div className="my-car-managed-images">{managedImages.map((image, index) => { const src = imageSource(image); return <article key={image.id ?? image.carImageId ?? image.publicId ?? index}><img src={src} alt={`Ảnh xe ${index + 1}`} /><div><span>Ảnh {index + 1}</span><button type="button" disabled={managementBusy} onClick={() => deleteManagedImage(image)}>Xóa ảnh</button></div></article> })}{!managedImages.length && <p className="my-car-management-empty">Xe chưa có ảnh. Thêm ảnh đầu tiên ở phía trên.</p>}</div>
      </div>}</>}
      </> : <><header><div><span className="my-cars-eyebrow">HỒ SƠ XE</span><h2 id="my-cars-dialog-title">{dialog.mode === 'create' ? 'Đăng ký xe' : 'Cập nhật xe'}</h2></div><button type="button" aria-label="Đóng" disabled={saving || uploadingImages > 0} onClick={() => setDialog(null)}>×</button></header>
      {(dialog.mode === 'create' || dialog.mode === 'edit') ? dialog.loading ? <div className="my-cars-state">Đang tải thông tin xe…</div> : <form className="my-car-form" onSubmit={submit}>
        <label>Tên xe<input name="carName" required value={form.carName} onChange={change} /></label><label>Năm sản xuất<select name="productionYear" required value={form.productionYear} onChange={change}>{Array.from({ length: Math.max(1, currentYear - 1999) }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <label>Hiệu xe<select name="carBrandId" required value={form.carBrandId} onChange={change}><option value="">Chọn hiệu xe</option>{brands.map((brand, index) => <option key={idOf(brand) ?? index} value={idOf(brand) ?? ''}>{brandNameOf(brand)}</option>)}</select>{brandError && <small className="admin-car-filter-hint" role="alert">{brandError}</small>}</label><label>Số chỗ<select name="numSeats" required value={form.numSeats} onChange={change}><option value="5">5 chỗ</option><option value="7">7 chỗ</option></select></label>
        <fieldset className="my-car-form-wide my-car-location-picker"><legend>Địa điểm xe</legend><label>Tỉnh / thành<select name="provinceId" required value={form.provinceId} onChange={change}><option value="">{provinces.length ? 'Chọn tỉnh / thành' : 'Đang tải tỉnh / thành…'}</option>{provinces.map((province, index) => <option key={provinceIdOf(province) ?? index} value={provinceIdOf(province) ?? ''}>{provinceNameOf(province)}</option>)}</select>{provinceError && <small role="alert">{provinceError}</small>}</label><label>Quận / huyện<select name="districtId" required value={form.districtId} onChange={change} disabled={!form.provinceId || districtLoading}><option value="">{districtLoading ? 'Đang tải quận huyện…' : form.provinceId ? 'Chọn quận / huyện' : 'Chọn tỉnh / thành trước'}</option>{districts.map((district, index) => <option key={districtIdOf(district) ?? index} value={districtIdOf(district) ?? ''}>{districtNameOf(district)}</option>)}</select>{districtError && <small role="alert">{districtError}</small>}</label></fieldset>
        <label>Hộp số<select name="transmission" value={form.transmission} onChange={change}><option value="1">Số tự động</option><option value="2">Số sàn</option></select></label><label>Nhiên liệu<select name="typeFuel" value={form.typeFuel} onChange={change}><option value="1">Xăng</option><option value="2">Dầu diesel</option><option value="3">Điện</option></select></label>
        <label>Mức tiêu hao (lít/100km)<input name="fuelConsumption" type="text" inputMode="decimal" required value={form.fuelConsumption} onChange={change} placeholder="Ví dụ: 6,5" /></label><label>Giá thuê mỗi ngày (đ)<input name="pricePerDay" type="text" inputMode="numeric" required value={form.pricePerDay} onChange={change} placeholder="Ví dụ: 800000" /></label>
        {dialog.mode === 'create' && <fieldset className="my-car-form-wide my-car-feature-picker"><legend>Tính năng xe <span>({form.features.length} đã chọn)</span></legend>{featureLoading ? <small>Đang tải danh sách tính năng…</small> : featureError ? <small role="alert">{featureError}</small> : features.length ? features.map((feature, index) => { const featureId = featureIdOf(feature); return <label className="my-car-feature" key={featureId ?? index}><input type="checkbox" checked={form.features.map(Number).includes(Number(featureId))} onChange={() => toggleFeature(featureId)} />{featureNameOf(feature) || `Tính năng ${featureId}`}</label> }) : <small>Chưa có tính năng nào trong danh sách.</small>}</fieldset>}
        {dialog.mode === 'create' && <div className="my-car-form-wide my-car-create-images"><span>Ảnh xe <small>(tối đa 5 ảnh)</small></span><label className={`my-car-image-upload ${imageEntries.length >= 5 ? 'is-disabled' : ''}`}><input type="file" accept="image/*" multiple disabled={imageEntries.length >= 5} onChange={handleImageSelection}/><span aria-hidden="true">＋</span><strong>Chọn hình</strong><small>{imageEntries.length}/5 ảnh đã chọn{uploadingImages > 0 ? ` · Đang tải ${uploadingImages} ảnh…` : ''}</small></label><div className="my-car-previews">{imageEntries.map((image) => <div className="my-car-preview" key={image.id}><img src={image.previewUrl} alt={image.file.name} /><div><strong>{image.file.name}</strong><small>{image.uploading ? 'Đang tải lên…' : image.error ? image.error : `Đã tải · ${image.publicId}`}</small></div><button type="button" disabled={image.uploading} onClick={() => removeImage(image.id)} aria-label={`Xóa ảnh ${image.file.name}`}>×</button></div>)}</div></div>}
        <label className="my-car-form-wide">Mô tả<textarea name="description" rows="3" value={form.description} onChange={change} /></label><label className="my-car-form-wide">Chính sách<textarea name="policy" rows="3" value={form.policy} onChange={change} /></label>
        <div className="my-car-form-actions my-car-form-wide"><button type="button" onClick={() => setDialog(null)} disabled={saving || uploadingImages > 0}>Hủy</button><button className="my-cars-primary" type="submit" disabled={saving || brands.length === 0 || uploadingImages > 0 || (dialog.mode === 'create' && imageEntries.some((image) => !image.publicId))}>{saving ? 'Đang lưu…' : uploadingImages > 0 ? 'Đang tải ảnh…' : dialog.mode === 'create' ? 'Tạo xe' : 'Lưu thay đổi'}</button></div>
      </form> : dialog.loading ? <p className="my-cars-state">Đang tải chi tiết xe…</p> : dialog.error ? <p className="my-cars-error">{dialog.error}</p> : <div className="my-car-detail">{carImages.length ? <div className="my-car-detail-images">{carImages.map((src, index) => <img key={src + index} src={src} alt={`${dialog.car.carName} ${index + 1}`} />)}</div> : <div className="my-cars-state">Xe chưa có ảnh</div>}<div className="my-car-detail-grid"><div><span>Thương hiệu</span><strong>{brandName(dialog.car)}</strong></div><div><span>Năm sản xuất</span><strong>{dialog.car.productionYear || '—'}</strong></div><div><span>Số chỗ</span><strong>{dialog.car.numSeats || '—'}</strong></div><div><span>Hộp số</span><strong>{Number(dialog.car.transmission) === 2 ? 'Số sàn' : 'Số tự động'}</strong></div><div><span>Nhiên liệu</span><strong>{({ 1: 'Xăng', 2: 'Dầu diesel', 3: 'Điện' })[dialog.car.typeFuel] || '—'}</strong></div><div><span>Tiêu hao</span><strong>{dialog.car.fuelConsumption || '—'} / 100km</strong></div><div><span>Giá mỗi ngày</span><strong>{Number(dialog.car.pricePerDay || 0).toLocaleString('vi-VN')}đ</strong></div><div><span>Địa điểm</span><strong>{[dialog.car.districtName, dialog.car.provinceName].filter(Boolean).join(', ') || '—'}</strong></div></div><h3>Mô tả</h3><p>{dialog.car.description || 'Chưa có mô tả.'}</p><h3>Chính sách</h3><p>{dialog.car.policy || 'Chưa có chính sách.'}</p><button className="my-cars-primary" onClick={() => openEdit(dialog.car)}>Sửa thông tin xe</button></div>}
      </>}</section></div>}
  </main>
}

export default MyCarsPage
