import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildApiUrl } from '../../constants/api'
import { getCarBrands } from '../../services/carBrandService'
import { getAdminCarById, getAdminCars, updateCarStatus } from '../../services/carService'
import { getProvinces } from '../../services/provinceService'
import { getDistricts } from '../../services/districtService'
import FeatureIcon from '../../components/ui/FeatureIcon/FeatureIcon'
import { getCarFeatureItems } from '../../utils/carFeatures'
import UserDetailsDialog from './UserDetailsDialog'

const BATCH_SIZE = 20
const CAR_STATUSES = [
  { value: 1, label: 'Đang hoạt động', className: 'active' },
  { value: 2, label: 'Chờ duyệt', className: 'pending' },
  { value: 3, label: 'Đã khóa', className: 'blocked' },
]
const TRANSMISSIONS = [
  { value: 1, label: 'Số tự động' },
  { value: 2, label: 'Số sàn' },
]
const FUELS = [
  { value: 1, label: 'Xăng' },
  { value: 2, label: 'Dầu diesel' },
  { value: 3, label: 'Điện' },
]

function getCarId(car) {
  return car?.carId ?? car?.id
}

function getOwnerId(car) {
  return car?.ownerId ?? car?.ownerUserId ?? car?.userId ?? car?.owner?.userId ?? car?.owner?.id
}

function normalizeCar(item) {
  if (!item?.car) return item
  const images = item.images
    ?? item.car.images
    ?? item.car.carImages
    ?? item.car.imageUrls
    ?? item.car.imageList
    ?? item.imageList
    ?? item.carImageList
    ?? (item.imageUrl ? [item.imageUrl] : [])
  return {
    ...item.car,
    brandName: item.brandName,
    districtName: item.districtName,
    provinceName: item.provinceName,
    ownerName: item.ownerName ?? item.car.ownerName,
    ownerId: item.ownerId ?? item.ownerUserId ?? item.userId ?? item.owner?.userId ?? item.owner?.id
      ?? item.car.ownerId ?? item.car.ownerUserId ?? item.car.userId ?? item.car.owner?.userId ?? item.car.owner?.id,
    imageUrl: item.imageUrl ?? item.car.imageUrl,
    images,
    features: item.features ?? item.carFeatures ?? item.car.features ?? item.car.carFeatures ?? item.featureList ?? item.car.featureList ?? item.carFeatureList ?? item.car.carFeatureList,
  }
}

function extractCarDetail(payload, carId) {
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : [payload?.item || payload]
  const selected = candidates.find((item) => String(item?.car?.carId ?? item?.carId ?? item?.id) === String(carId))
    || candidates[0]
  return selected ? normalizeCar(selected) : null
}

function getCarImageUrls(car) {
  const asImageList = (images) => Array.isArray(images) ? images : images ? [images] : []
  const candidates = [
    ...asImageList(car?.images),
    ...asImageList(car?.carImages),
    ...asImageList(car?.imageUrls),
    ...asImageList(car?.imageList),
    ...asImageList(car?.image),
    ...asImageList(car?.imageUrl),
  ]
  const urls = candidates.map((image) => {
    const imageUrl = typeof image === 'string'
      ? image
      : image?.imageUrl ?? image?.url ?? image?.path ?? image?.imagePath ?? image?.src
    if (!imageUrl) return ''
    if (/^(https?:|data:|blob:|\/\/)/i.test(imageUrl)) return imageUrl
    return buildApiUrl(imageUrl)
  }).filter(Boolean)
  return [...new Set(urls)]
}

function getBrandId(brand) {
  return brand?.carBrandId ?? brand?.brandId ?? brand?.id
}

function getBrandName(brand) {
  return brand?.nameBrand ?? brand?.name ?? ''
}

function getProvinceId(province) {
  return province?.provinceId ?? province?.id
}

function getProvinceName(province) {
  return province?.provinceName ?? province?.nameProvince ?? province?.name ?? ''
}

function getDistrictId(district) {
  return district?.districtId ?? district?.id
}

function getDistrictName(district) {
  return district?.districtName ?? district?.nameDistrict ?? district?.name ?? ''
}

function getCarBrandName(car, brands) {
  const nested = car?.carBrand || car?.brand
  const nestedName = nested?.nameBrand ?? nested?.name
  if (nestedName) return nestedName
  const directName = car?.carBrandName ?? car?.brandName ?? car?.nameBrand
  if (directName) return directName
  const brandId = car?.carBrandId ?? nested?.carBrandId ?? nested?.id
  const matchedBrand = brands.find((brand) => String(getBrandId(brand)) === String(brandId))
  return matchedBrand ? getBrandName(matchedBrand) : '—'
}

function getStatus(car) {
  const rawStatus = car?.status ?? car?.carStatus
  const numericStatus = Number(rawStatus)
  return CAR_STATUSES.find(({ value }) => value === numericStatus) || CAR_STATUSES[1]
}

function getEnumLabel(value, options) {
  const match = options.find((option) => Number(value) === option.value)
  return match?.label || value || '—'
}

function DetailIcon({ type }) {
  const paths = {
    description: <><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v5h5M9 13h6m-6 4h6"/></>,
    policy: <><path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    features: <><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="5"/><path d="m10 12 1.3 1.3L14.5 10"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></>,
    seats: <><circle cx="9" cy="8" r="2.5"/><circle cx="17" cy="9" r="2"/><path d="M4 19a5 5 0 0 1 10 0m1-4a4 4 0 0 1 5 4"/></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></>,
    price: <><path d="M12 3v18m5-14H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/></>,
    fuel: <><path d="M12 3c2.2 3.2 5.5 6.7 5.5 11a5.5 5.5 0 0 1-11 0C6.5 9.7 9.8 6.2 12 3Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5"/></>,
    gear: <><path d="M8 4v7a4 4 0 0 0 4 4h2a3 3 0 0 1 3 3v2"/><circle cx="8" cy="4" r="2"/><path d="M8 9H5m3 0h3"/></>,
    year: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m3 0h2m-7 3h2"/></>,
    id: <><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16a2.7 2.7 0 0 1 5 0m3-5h3m-3 3h3"/></>,
  }
  return <svg className="admin-car-detail-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[type] || paths.features}</svg>
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—'
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${new Intl.NumberFormat('vi-VN').format(numericValue)}đ` : `${value}đ`
}

function getAllowedStatusChanges(status) {
  if (status === 2) return [CAR_STATUSES[0], CAR_STATUSES[2]]
  if (status === 1) return [CAR_STATUSES[2]]
  if (status === 3) return [CAR_STATUSES[0]]
  return []
}

function CarManagement({ canWrite, onRefreshPermissions }) {
  const [brands, setBrands] = useState([])
  const [provinces, setProvinces] = useState([])
  const [provinceError, setProvinceError] = useState('')
  const [districts, setDistricts] = useState([])
  const [districtsLoading, setDistrictsLoading] = useState(false)
  const [districtError, setDistrictError] = useState('')
  const [districtsProvinceId, setDistrictsProvinceId] = useState('')
  const [cars, setCars] = useState([])
  const [filters, setFilters] = useState({
    status: '',
    productionYear: '',
    carBrandId: '',
    numSeats: '',
    transmission: '',
    typeFuel: '',
    fuelConsumption: '',
    pricePerDay: '',
    provinceId: '',
    districtId: '',
  })
  const [appliedFilters, setAppliedFilters] = useState({})
  const filterKey = useMemo(() => JSON.stringify(appliedFilters), [appliedFilters])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [listError, setListError] = useState('')
  const [brandError, setBrandError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [statusCar, setStatusCar] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [detailState, setDetailState] = useState(null)
  const [ownerProfileId, setOwnerProfileId] = useState(null)
  const [detailImages, setDetailImages] = useState([])
  const [detailImageIndex, setDetailImageIndex] = useState(0)
  const [carImageIndexes, setCarImageIndexes] = useState({})
  const [notification, setNotification] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const listEndRef = useRef(null)
  const listScrollRef = useRef(null)
  const loadingRef = useRef(false)
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(true)
  const requestIdRef = useRef(0)
  const districtRequestRef = useRef(0)

  useEffect(() => {
    let mounted = true
    getCarBrands({ count: 500, offset: 0 }).then((result) => {
      if (!mounted) return
      if (result.success) setBrands(result.data)
      else setBrandError(result.message)
    }).catch(() => {
      if (mounted) setBrandError('Không thể tải danh sách thương hiệu.')
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadProvinceOptions = async () => {
      try {
        const all = []
        let offset = 0
        const count = 100
        while (true) {
          const result = await getProvinces({ count, offset })
          if (!result.success) throw new Error(result.message)
          all.push(...result.data)
          if (result.data.length < count) break
          offset += result.data.length
        }
        if (mounted) setProvinces(all)
      } catch (error) {
        if (mounted) setProvinceError(error.message || 'Không thể tải danh sách tỉnh thành.')
      }
    }
    loadProvinceOptions()
    return () => { mounted = false }
  }, [])

  const loadBatch = useCallback(async (reset = false) => {
    if ((loadingRef.current && !reset) || (!reset && !hasMoreRef.current)) return
    if (reset) loadingRef.current = false
    loadingRef.current = true
    const requestId = reset ? requestIdRef.current + 1 : requestIdRef.current
    requestIdRef.current = requestId
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
      const result = await getAdminCars({
        count: BATCH_SIZE,
        offset,
        filters: JSON.parse(filterKey),
      })
      if (requestId !== requestIdRef.current) return
      if (!result.success) {
        setListError(result.message)
        if (reset) setCars([])
        return
      }

      const batch = result.data.map(normalizeCar)
      setCars((current) => {
        const base = reset ? [] : current
        const seen = new Set(base.map(getCarId))
        return [...base, ...batch.filter((car) => {
          const id = getCarId(car)
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
      if (requestId !== requestIdRef.current) return
      setListError('Không thể kết nối máy chủ. Vui lòng thử lại.')
      if (reset) setCars([])
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [filterKey])

  useEffect(() => {
    // Fetch the first page when filters change or the list is refreshed.
    // oxlint-disable-next-line react/set-state-in-effect
    loadBatch(true)
  }, [loadBatch, reloadKey])

  useEffect(() => {
    const sentinel = listEndRef.current
    if (!sentinel || !hasMore || loading || loadingMore || listError) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadBatch()
    }, { root: listScrollRef.current, rootMargin: '260px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, listError, loadBatch, cars.length])

  useEffect(() => {
    if (!notification) return undefined
    const timer = window.setTimeout(() => setNotification(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notification])

  const changeFilter = (event) => {
    const { name, value } = event.target
    if (name === 'provinceId') {
      districtRequestRef.current += 1
      setDistricts([])
      setDistrictsProvinceId('')
      setDistrictError('')
      setDistrictsLoading(false)
      setFilters((current) => ({ ...current, provinceId: value, districtId: '' }))
      return
    }
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const loadDistrictOptions = async () => {
    const provinceId = filters.provinceId
    if (!provinceId || districtsLoading || districtsProvinceId === provinceId) return
    const requestId = ++districtRequestRef.current
    setDistrictsLoading(true)
    setDistrictError('')
    try {
      const all = []
      let offset = 0
      const count = 100
      while (true) {
        const result = await getDistricts(provinceId, { count, offset })
        if (!result.success) throw new Error(result.message)
        all.push(...result.data)
        if (result.data.length < count) break
        offset += result.data.length
      }
      if (requestId !== districtRequestRef.current) return
      setDistricts(all)
      setDistrictsProvinceId(provinceId)
    } catch (error) {
      if (requestId === districtRequestRef.current) setDistrictError(error.message || 'Không thể tải danh sách quận huyện.')
    } finally {
      if (requestId === districtRequestRef.current) setDistrictsLoading(false)
    }
  }

  const applyFilters = (event) => {
    event?.preventDefault()
    const nextFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
    setAppliedFilters(nextFilters)
    setFiltersOpen(false)
  }

  const clearFilters = () => {
    districtRequestRef.current += 1
    setDistricts([])
    setDistrictsProvinceId('')
    setDistrictError('')
    setDistrictsLoading(false)
    const emptyFilters = Object.fromEntries(Object.keys(filters).map((key) => [key, '']))
    setFilters(emptyFilters)
    setAppliedFilters({})
  }

  const openStatusEditor = (car) => {
    const currentStatus = getStatus(car)
    const choices = getAllowedStatusChanges(currentStatus.value)
    if (!choices.length) return
    setStatusCar(car)
    setSelectedStatus(choices[0].value)
  }

  const openCarDetail = async (car) => {
    const id = getCarId(car)
    setDetailImages([])
    setDetailImageIndex(0)
    setDetailState({ loading: true, error: '', car: null })
    try {
      const result = await getAdminCarById(id)
      if (!result.success) {
        setDetailState({ loading: false, error: result.message, car: null })
        return
      }
      const detail = extractCarDetail(result.data, id)
      if (detail) setDetailImages(getCarImageUrls(detail))
      setDetailState(detail
        ? { loading: false, error: '', car: detail }
        : { loading: false, error: 'Không tìm thấy thông tin xe.', car: null })
    } catch {
      setDetailState({ loading: false, error: 'Không thể kết nối máy chủ. Vui lòng thử lại.', car: null })
    }
  }

  const saveStatus = async (event) => {
    event.preventDefault()
    const id = getCarId(statusCar)
    if (id == null || selectedStatus == null) return
    setStatusSaving(true)
    try {
      const result = await updateCarStatus(id, selectedStatus)
      if (!result.success) {
        setNotification({ type: 'error', message: result.message })
        return
      }
      const statusLabel = CAR_STATUSES.find(({ value }) => value === selectedStatus)?.label
      setNotification({ type: 'success', message: `Đã chuyển xe sang trạng thái “${statusLabel}”.` })
      setStatusCar(null)
      setReloadKey((key) => key + 1)
    } catch {
      setNotification({ type: 'error', message: 'Không thể kết nối máy chủ. Vui lòng thử lại.' })
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <section className="admin-car-manager" aria-labelledby="admin-car-heading">
      <div className="admin-car-manager__heading">
        <div>
          <span className="admin-module-card__eyebrow">QUẢN LÝ ĐỘI XE</span>
          <h2 id="admin-car-heading">Danh sách xe</h2>
          <p>Lọc, theo dõi và cập nhật trạng thái xe trong hệ thống.</p>
        </div>
        <div className="admin-car-manager__tools">
          <button className="admin-car-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="admin-car-filter-panel" onClick={() => setFiltersOpen((open) => !open)}>
            <span aria-hidden="true">☷</span> Bộ lọc {Object.keys(appliedFilters).length > 0 && <b>{Object.keys(appliedFilters).length}</b>}
          </button>
          <button className="admin-car-search" type="button" onClick={() => applyFilters()}>Tìm kiếm</button>
          <button className="admin-car-refresh" type="button" onClick={() => setReloadKey((key) => key + 1)}>↻ Tải lại</button>
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

      {filtersOpen && <form id="admin-car-filter-panel" className="admin-car-filters" onSubmit={applyFilters}>
        <div className="admin-car-filters__head">
          <span className="admin-car-filters__head-icon" aria-hidden="true">☷</span>
          <div>
            <strong>Bộ lọc danh sách</strong>
            <small>Lọc xe theo trạng thái và thông số kỹ thuật</small>
          </div>
          <span className="admin-car-filters__count">{Object.keys(appliedFilters).length} điều kiện đang áp dụng</span>
        </div>
        <label>
          <span>Trạng thái</span>
          <select name="status" value={filters.status} onChange={changeFilter}>
            <option value="">Tất cả trạng thái</option>
            {CAR_STATUSES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Thương hiệu</span>
          <select name="carBrandId" value={filters.carBrandId} onChange={changeFilter}>
            <option value="">Tất cả thương hiệu</option>
            {brands.map((brand, index) => (
              <option key={getBrandId(brand) ?? index} value={getBrandId(brand)}>{getBrandName(brand)}</option>
            ))}
          </select>
          {brandError && <small className="admin-car-filter-hint">{brandError}</small>}
        </label>
        <label>
          <span>Năm sản xuất</span>
          <input name="productionYear" type="number" min="1900" max="2100" value={filters.productionYear} onChange={changeFilter} placeholder="Ví dụ: 2022" />
        </label>
        <label>
          <span>Số chỗ</span>
          <select name="numSeats" value={filters.numSeats} onChange={changeFilter}>
            <option value="">Tất cả</option><option value="5">5 chỗ</option><option value="7">7 chỗ</option>
          </select>
        </label>
        <label>
          <span>Hộp số</span>
          <select name="transmission" value={filters.transmission} onChange={changeFilter}>
            <option value="">Tất cả</option>
            {TRANSMISSIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Nhiên liệu</span>
          <select name="typeFuel" value={filters.typeFuel} onChange={changeFilter}>
            <option value="">Tất cả</option>
            {FUELS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Mức tiêu hao</span>
          <input name="fuelConsumption" type="number" min="0" step="0.1" value={filters.fuelConsumption} onChange={changeFilter} placeholder="L/100km hoặc kWh" />
        </label>
        <label>
          <span>Giá thuê/ngày</span>
          <input name="pricePerDay" type="number" min="0" step="any" value={filters.pricePerDay} onChange={changeFilter} placeholder="Nhập mức giá" />
        </label>
        <label>
          <span>Tỉnh/thành</span>
          <select name="provinceId" value={filters.provinceId} onChange={changeFilter} disabled={!provinces.length}>
            <option value="">Tất cả tỉnh/thành</option>
            {provinces.map((province, index) => (
              <option key={getProvinceId(province) ?? index} value={getProvinceId(province)}>{getProvinceName(province)}</option>
            ))}
          </select>
          {provinceError && <small className="admin-car-filter-hint">{provinceError}</small>}
        </label>
        <label>
          <span>Quận/huyện</span>
          <select name="districtId" value={filters.districtId} onChange={changeFilter} onFocus={loadDistrictOptions} disabled={!filters.provinceId}>
            <option value="">{districtsLoading ? 'Đang tải quận/huyện…' : filters.provinceId ? 'Tất cả quận/huyện' : 'Chọn tỉnh/thành trước'}</option>
            {districtsProvinceId === filters.provinceId && districts.map((district, index) => (
              <option key={getDistrictId(district) ?? index} value={getDistrictId(district)}>{getDistrictName(district)}</option>
            ))}
          </select>
          {districtError && <small className="admin-car-filter-hint">{districtError} <button type="button" onClick={loadDistrictOptions}>Thử lại</button></small>}
        </label>
        <div className="admin-car-filters__actions">
          <span className="admin-car-filters__helper">Chọn tiêu chí rồi áp dụng để cập nhật danh sách xe.</span>
          <div>
            <button className="admin-car-clear" type="button" onClick={clearFilters}>Xóa bộ lọc</button>
            <button className="admin-car-apply" type="submit">Áp dụng bộ lọc</button>
          </div>
        </div>
      </form>}

      {listError && (
        <div className="admin-brand-error" role="alert">
          <span>{listError}</span>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button>
        </div>
      )}

      <div ref={listScrollRef} className="admin-car-results-scroll">
      {loading ? (
        <div className="admin-brand-state">Đang tải danh sách xe…</div>
      ) : cars.length ? (
        <>
          <div className="admin-car-grid">
            {cars.map((car, index) => {
              const id = getCarId(car)
              const status = getStatus(car)
              const images = getCarImageUrls(car)
              const imageIndex = (carImageIndexes[id] || 0) % Math.max(images.length, 1)
              const carName = car?.carName ?? car?.nameCar ?? car?.modelName ?? car?.name ?? `Xe #${id ?? index + 1}`
              const changeImage = (event, direction) => {
                event.stopPropagation()
                setCarImageIndexes((current) => ({ ...current, [id]: (imageIndex + direction + images.length) % images.length }))
              }
              return (
                <article className="admin-car-card" key={id ?? index}>
                  <div className="admin-car-card__cover">
                    <button className="admin-car-card__photo" type="button" onClick={() => openCarDetail(car)} aria-label={`Xem chi tiết ${carName}`}>
                      {images.length
                        ? <img src={images[imageIndex]} alt={`${carName} — ảnh ${imageIndex + 1}`} loading="lazy" />
                        : <span className="admin-car-card__empty-photo" aria-hidden="true">🚘</span>}
                    </button>
                    <span className={`admin-car-status admin-car-status--${status.className}`}>{status.label}</span>
                    {images.length > 1 && <>
                      <button className="admin-car-card__arrow admin-car-card__arrow--prev" type="button" onClick={(event) => changeImage(event, -1)} aria-label="Ảnh trước">‹</button>
                      <button className="admin-car-card__arrow admin-car-card__arrow--next" type="button" onClick={(event) => changeImage(event, 1)} aria-label="Ảnh tiếp theo">›</button>
                      <span className="admin-car-card__photo-count">{imageIndex + 1} / {images.length}</span>
                    </>}
                  </div>
                  <div className="admin-car-card__body">
                    <div className="admin-car-card__title-row">
                      <div className="admin-car-card__title">
                        <h3>{carName}</h3>
                        <p>{getCarBrandName(car, brands)} <span>·</span> {car?.productionYear || '—'}</p>
                      </div>
                      <div className="admin-car-card__price"><strong>{formatPrice(car?.pricePerDay)}</strong><span>/ ngày</span></div>
                    </div>
                    <div className="admin-car-card__specs">
                      <span><b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 20v-2a5 5 0 0 1 10 0v2M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 20v-1a4 4 0 0 1 3-3.87M20 20v-1a4 4 0 0 0-3-3.87"/></svg></b>{car?.numSeats ? `${car.numSeats} chỗ` : '—'}</span>
                      <span><b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4v7a4 4 0 0 0 4 4h2a3 3 0 0 1 3 3v2"/><circle cx="8" cy="4" r="2"/><path d="M8 9H5m3 0h3"/></svg></b>{getEnumLabel(car?.transmission, TRANSMISSIONS)}</span>
                      <span><b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3c2.2 3.2 5.5 6.7 5.5 11a5.5 5.5 0 0 1-11 0C6.5 9.7 9.8 6.2 12 3Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5"/></svg></b>{getEnumLabel(car?.typeFuel, FUELS)}</span>
                    </div>
                    <div className="admin-car-card__location"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg></span>{[car?.district?.name ?? car?.districtName, car?.province?.name ?? car?.provinceName].filter(Boolean).join(', ') || 'Chưa cập nhật địa điểm'}</div>
                    {(car?.ownerName || getOwnerId(car) != null) && <button type="button" className="admin-car-card__owner" disabled={getOwnerId(car) == null} onClick={() => setOwnerProfileId(getOwnerId(car))}><span aria-hidden="true"><DetailIcon type="user" /></span><small>Chủ xe</small><strong>{car.ownerName || `User #${getOwnerId(car)}`}</strong></button>}
                    {canWrite && <div className="admin-car-card__actions">
                      <button className="admin-car-status-button" type="button" disabled={!getAllowedStatusChanges(status.value).length} onClick={() => openStatusEditor(car)}>
                        <span aria-hidden="true">↻</span> Đổi trạng thái
                      </button>
                    </div>}
                  </div>
                </article>
              )
            })}
          </div>
          <div ref={listEndRef} className="admin-brand-list-end" aria-live="polite">
            {loadingMore ? 'Đang tải thêm xe…' : hasMore ? 'Cuộn xuống để tải thêm xe' : 'Đã hiển thị hết danh sách xe'}
          </div>
        </>
      ) : !listError ? (
        <div className="admin-brand-state"><strong>Không tìm thấy xe phù hợp</strong><span>Hãy thử thay đổi hoặc xóa bộ lọc.</span></div>
      ) : null}
      </div>

      {statusCar && (
        <div className="admin-brand-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !statusSaving) setStatusCar(null)
        }}>
          <section className="admin-brand-modal admin-car-status-modal" role="dialog" aria-modal="true" aria-labelledby="car-status-title">
            <div className="admin-brand-modal__heading">
              <div>
                <span className="admin-module-card__eyebrow">CẬP NHẬT TRẠNG THÁI</span>
                <h2 id="car-status-title">{getStatus(statusCar).value === 2 ? 'Duyệt hoặc khóa xe' : 'Đổi trạng thái xe'}</h2>
              </div>
              <button type="button" aria-label="Đóng" disabled={statusSaving} onClick={() => setStatusCar(null)}>×</button>
            </div>
            <p className="admin-car-status-modal__car">{statusCar?.nameCar ?? statusCar?.carName ?? statusCar?.modelName ?? `Xe #${getCarId(statusCar)}`}</p>
            <form onSubmit={saveStatus}>
              <div className="admin-car-status-options">
                {getAllowedStatusChanges(getStatus(statusCar).value).map((status) => (
                  <label key={status.value} className={`admin-car-status-option admin-car-status-option--${status.className}`}>
                    <input type="radio" name="status" value={status.value} checked={selectedStatus === status.value} onChange={() => setSelectedStatus(status.value)} />
                    <span><i />{status.label}</span>
                    <small>{status.value === 1 ? 'Cho phép xe xuất hiện và được đặt.' : status.value === 2 ? 'Đưa xe về danh sách chờ duyệt.' : 'Ẩn xe khỏi hoạt động cho đến khi mở khóa.'}</small>
                  </label>
                ))}
              </div>
              <div className="admin-brand-modal__actions">
                <button type="button" className="admin-brand-cancel" disabled={statusSaving} onClick={() => setStatusCar(null)}>Hủy</button>
                <button type="submit" className="admin-brand-add" disabled={statusSaving}>{statusSaving ? 'Đang cập nhật…' : 'Xác nhận'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {detailState && (
        <div className="admin-car-detail-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDetailState(null)
        }}>
          <section className="admin-car-detail-modal" role="dialog" aria-modal="true" aria-labelledby="admin-car-detail-title">
            <header className="admin-car-detail__header">
              <span className="admin-car-detail__header-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="m8 25 3.2-9.2a4 4 0 0 1 3.8-2.7h18a4 4 0 0 1 3.8 2.7L40 25v11h-4v-4H12v4H8V25Z"/><path d="M11 25h26M15 18h18M13 28h4m14 0h4"/></svg></span>
              <div className="admin-car-detail__header-copy">
                <span className="admin-module-card__eyebrow">HỒ SƠ XE #{getCarId(detailState.car) ?? ''}</span>
                <h2 id="admin-car-detail-title">{detailState.car?.carName || 'Chi tiết xe'}</h2>
                {detailState.car && <span className={`admin-car-status admin-car-status--${getStatus(detailState.car).className}`}>{getStatus(detailState.car).label}</span>}
              </div>
              <button type="button" className="admin-car-detail__close" aria-label="Đóng" onClick={() => setDetailState(null)}>×</button>
            </header>

            {detailState.loading ? (
              <div className="admin-car-detail__state">Đang tải chi tiết xe…</div>
            ) : detailState.error ? (
              <div className="admin-car-detail__state admin-car-detail__state--error" role="alert">{detailState.error}</div>
            ) : detailState.car && (
              <div className="admin-car-detail__content">
                <section className="admin-car-gallery" aria-label="Thư viện ảnh xe">
                  <div className="admin-car-gallery__heading">
                    <h3>Hình ảnh xe</h3>
                    <span>{detailImages.length} ảnh</span>
                  </div>
                  {detailImages.length ? (
                    <div className="admin-car-gallery__carousel">
                      <img src={detailImages[detailImageIndex]} alt={`${detailState.car.carName || 'Xe'} — ảnh ${detailImageIndex + 1}`} />
                      {detailImages.length > 1 && <>
                        <button type="button" aria-label="Ảnh trước" onClick={() => setDetailImageIndex((current) => (current - 1 + detailImages.length) % detailImages.length)}>‹</button>
                        <button type="button" aria-label="Ảnh tiếp theo" onClick={() => setDetailImageIndex((current) => (current + 1) % detailImages.length)}>›</button>
                        <span>{detailImageIndex + 1} / {detailImages.length}</span>
                      </>}
                    </div>
                  ) : <div className="admin-car-gallery__empty"><span aria-hidden="true">▧</span>Xe chưa có ảnh</div>}
                </section>
                <div className="admin-car-detail__grid">
                  <div><span><DetailIcon type="features" />Thương hiệu</span><strong>{getCarBrandName(detailState.car, brands)}</strong></div>
                  <div><span><DetailIcon type="year" />Năm sản xuất</span><strong>{detailState.car.productionYear || '—'}</strong></div>
                  <div><span><DetailIcon type="seats" />Số chỗ</span><strong>{detailState.car.numSeats ? `${detailState.car.numSeats} chỗ` : '—'}</strong></div>
                  <div><span><DetailIcon type="gear" />Hộp số</span><strong>{getEnumLabel(detailState.car.transmission, TRANSMISSIONS)}</strong></div>
                  <div><span><DetailIcon type="fuel" />Nhiên liệu</span><strong>{getEnumLabel(detailState.car.typeFuel, FUELS)}</strong></div>
                  <div><span><DetailIcon type="fuel" />Mức tiêu hao</span><strong>{detailState.car.fuelConsumption ? `${detailState.car.fuelConsumption} / 100km` : '—'}</strong></div>
                  <div><span><DetailIcon type="price" />Giá thuê mỗi ngày</span><strong>{formatPrice(detailState.car.pricePerDay)}</strong></div>
                  <div><span><DetailIcon type="location" />Địa điểm</span><strong>{[detailState.car.districtName, detailState.car.provinceName].filter(Boolean).join(', ') || '—'}</strong></div>
                  <div><span><DetailIcon type="user" />Chủ xe</span>{getOwnerId(detailState.car) != null
                    ? <button type="button" className="admin-car-detail__owner-link" onClick={() => setOwnerProfileId(getOwnerId(detailState.car))}>{detailState.car.ownerName || `User #${getOwnerId(detailState.car)}`}</button>
                    : <strong>{detailState.car.ownerName || '—'}</strong>}</div>
                  <div><span><DetailIcon type="id" />Mã xe</span><strong>{getCarId(detailState.car) ?? '—'}</strong></div>
                </div>
                <section className="admin-car-detail__text admin-car-detail__features">
                  <h3><DetailIcon type="features" />Tính năng xe</h3>
                  {getCarFeatureItems(detailState.car).length
                    ? <div className="admin-car-feature-list">{getCarFeatureItems(detailState.car).map((feature, index) => <span key={feature.id ?? `${feature.name}-${index}`}><FeatureIcon iconKey={feature.iconKey} />{feature.name}</span>)}</div>
                    : <p>Chưa cập nhật tính năng xe.</p>}
                </section>
                <section className="admin-car-detail__text">
                  <h3><DetailIcon type="description" />Mô tả xe</h3>
                  <p>{detailState.car.description || 'Chưa có mô tả.'}</p>
                </section>
                <section className="admin-car-detail__text">
                  <h3><DetailIcon type="policy" />Chính sách</h3>
                  <p>{detailState.car.policy || 'Chưa có chính sách.'}</p>
                </section>
              </div>
            )}
          </section>
        </div>
      )}
      {ownerProfileId != null && <UserDetailsDialog userId={ownerProfileId} onClose={() => setOwnerProfileId(null)} />}
    </section>
  )
}

export default CarManagement
