import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCurrentUser } from '../../services/authService'
import { buildApiUrl } from '../../constants/api'
import { getCarBrands } from '../../services/carBrandService'
import { getCars, getAdminCarById } from '../../services/carService'
import './SearchCarsPage.css'
import '../AdminPage/AdminPage.css'

const BATCH_SIZE = 20
const filtersBlank = { carBrandId: '', productionYear: '', numSeats: '', transmission: '', typeFuel: '', fuelConsumption: '', pricePerDay: '' }
const carIdOf = (car) => car?.carId ?? car?.id
const carNameOf = (car) => car?.carName ?? car?.nameCar ?? car?.modelName ?? car?.name ?? 'Xe'
const imageUrls = (car) => {
  const images = car?.images ?? car?.carImages ?? car?.imageUrls ?? car?.imageList ?? (car?.imageUrl ? [car.imageUrl] : [])
  return (Array.isArray(images) ? images : images ? [images] : []).map((image) => {
    const url = typeof image === 'string' ? image : image?.imageUrl ?? image?.url ?? image?.path ?? image?.imagePath ?? image?.src
    if (url) return /^(https?:|data:|blob:|\/\/)/i.test(url) ? url : buildApiUrl(url)
    return image?.publicId ? buildApiUrl(`/api/images/${image.publicId}`) : ''
  }).filter(Boolean)
}
const normalize = (item) => item?.car ? { ...item.car, ...item, ownerName: item.ownerName ?? item.car.ownerName ?? item.owner?.displayName ?? item.owner?.name ?? item.car.owner?.displayName ?? item.car.owner?.name, images: item.images ?? item.car.images } : { ...item, ownerName: item?.ownerName ?? item?.owner?.displayName ?? item?.owner?.name }
const carFeatures = (car) => {
  const features = car?.features ?? car?.carFeatures ?? car?.featureList ?? car?.carFeatureList ?? []
  return (Array.isArray(features) ? features : []).map((item) => typeof item === 'string' ? item : item?.featureName ?? item?.nameFeature ?? item?.feature?.nameFeature ?? item?.name ?? '').filter(Boolean)
}
const prettyTime = (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

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

function SearchCarsPage() {
  const [searchParams] = useSearchParams()
  const currentUser = getCurrentUser()
  const accountName = currentUser?.displayName || currentUser?.name || 'Tài khoản'
  const avatarLetter = accountName.trim().charAt(0).toUpperCase() || 'U'
  const criteria = useMemo(() => {
    const startTime = Number(searchParams.get('startTime'))
    const endTime = Number(searchParams.get('endTime'))
    return Number.isFinite(startTime) && startTime > 0 && Number.isFinite(endTime) && endTime > startTime ? {
      provinceId: searchParams.get('provinceId') || '',
      districtId: searchParams.get('districtId') || '',
      startTime,
      endTime,
      locationLabel: searchParams.get('locationLabel') || 'Tất cả địa điểm',
    } : null
  }, [searchParams])
  const [brands, setBrands] = useState([])
  const [filters, setFilters] = useState(filtersBlank)
  const [appliedFilters, setAppliedFilters] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(Boolean(criteria))
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailImages, setDetailImages] = useState([])
  const [detailImageIndex, setDetailImageIndex] = useState(0)
  const requestIdRef = useRef(0)
  const autoOpenedCarRef = useRef('')

  useEffect(() => {
    let active = true
    getCarBrands({ count: 500, offset: 0 }).then((result) => { if (active && result.success) setBrands(result.data) }).catch(() => {})
    return () => { active = false }
  }, [])

  const loadCars = useCallback(async ({ nextFilters = appliedFilters, offset = 0, append = false } = {}) => {
    if (!criteria) return
    const requestId = ++requestIdRef.current
    append ? setLoadingMore(true) : setLoading(true)
    setError('')
    try {
      const result = await getCars({ count: BATCH_SIZE, offset, filters: { ...nextFilters, ...(criteria.provinceId ? { provinceId: criteria.provinceId } : {}), ...(criteria.districtId ? { districtId: criteria.districtId } : {}) }, startTime: criteria.startTime, endTime: criteria.endTime })
      if (requestId !== requestIdRef.current) return
      if (!result.success) throw new Error(result.message)
      const batch = result.data.map(normalize)
      setCars((current) => {
        const base = append ? current : []
        const seen = new Set(base.map((car) => String(carIdOf(car))))
        return [...base, ...batch.filter((car) => {
          const id = carIdOf(car)
          if (id == null || seen.has(String(id))) return false
          seen.add(String(id))
          return true
        })]
      })
      setHasMore(batch.length === BATCH_SIZE)
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return
      setError(loadError.message || 'Không thể tải danh sách xe.')
      if (!append) { setCars([]); setHasMore(false) }
    } finally {
      if (requestId === requestIdRef.current) { setLoading(false); setLoadingMore(false) }
    }
  }, [criteria, appliedFilters])

  useEffect(() => { loadCars({ nextFilters: appliedFilters }) }, [loadCars])

  const applyFilters = (event) => {
    event.preventDefault()
    const next = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
    setAppliedFilters(next)
  }
  const clearFilters = () => { setFilters(filtersBlank); setAppliedFilters({}) }

  const openDetail = useCallback(async (car) => {
    setDetail(car); setDetailImages([]); setDetailImageIndex(0); setDetailLoading(true); setDetailError('')
    try {
      const result = await getAdminCarById(carIdOf(car))
      if (!result.success) throw new Error(result.message)
      const response = result.data
      const payload = Array.isArray(response) ? response[0] : response?.items?.[0] ?? response?.item ?? response
      const normalized = normalize(payload)
      setDetail(normalized)
      setDetailImages(imageUrls(normalized))
    } catch (loadError) { setDetailError(loadError.message || 'Không thể tải chi tiết xe.') }
    finally { setDetailLoading(false) }
  }, [])

  useEffect(() => {
    const requestedCarId = searchParams.get('carId')
    if (!requestedCarId || !criteria || autoOpenedCarRef.current === requestedCarId) return
    autoOpenedCarRef.current = requestedCarId
    openDetail({ carId: requestedCarId })
  }, [criteria, openDetail, searchParams])

  if (!criteria) return <main className="search-results-page"><div className="search-results-empty"><h1>Hãy bắt đầu tìm xe</h1><p>Chọn thời gian và địa điểm nhận xe trên trang chủ để xem xe phù hợp.</p><Link to="/">Quay về trang chủ</Link></div></main>

  return <main className="search-results-page">
    <header className="search-results-navbar"><div className="search-results-navbar__inner"><Link className="my-cars-brand" to="/" aria-label="Mioto - Trang chủ"><span>M</span> mioto</Link><nav aria-label="Điều hướng chính">{currentUser && <Link to="/my-cars">Xe của tôi</Link>}</nav>{currentUser ? <Link className="search-results-account" to="/profile"><span>{currentUser.avatarUrl || currentUser.avatar || currentUser.imageUrl ? <img src={currentUser.avatarUrl || currentUser.avatar || currentUser.imageUrl} alt="" /> : avatarLetter}</span>{accountName}</Link> : <Link className="search-results-account" to="/login">Đăng nhập</Link>}</div></header>
    <section className="search-results-hero"><div className="search-results-hero__copy"><span className="search-results-hero__eyebrow"><i /> KẾT QUẢ TÌM XE</span><h1>Sẵn sàng cho chuyến đi tiếp theo?</h1><p>Chọn chiếc xe phù hợp với lịch trình của bạn.</p></div><div className="search-results-trip"><div><span className="search-results-trip__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><span><small>ĐIỂM NHẬN XE</small><strong>{criteria.locationLabel}</strong></span></div><i /><div><span className="search-results-trip__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4m8-4v4M4 10h16M8 13h.01M12 13h.01M16 13h.01M8 16h.01M12 16h.01"/></svg></span><span><small>THỜI GIAN THUÊ</small><strong>{prettyTime(criteria.startTime)} – {prettyTime(criteria.endTime)}</strong></span></div><Link to="/" className="search-results-back">Sửa tìm kiếm</Link></div></section>
    <section className="search-results-list" aria-labelledby="search-results-title">
      <div className="search-results-list__controls">
      <div className="search-results-list__heading"><div><h2 id="search-results-title">Xe có sẵn</h2><p>Thời gian và địa điểm tìm kiếm được giữ nguyên</p></div><div className="search-results-tools"><span>{cars.length}{hasMore ? '+' : ''} xe</span><button className="admin-car-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="search-car-filter-panel" onClick={() => setFiltersOpen((open) => !open)}><span aria-hidden="true">☷</span> Bộ lọc {Object.keys(appliedFilters).length > 0 && <b>{Object.keys(appliedFilters).length}</b>}</button></div></div>
      {filtersOpen && <form id="search-car-filter-panel" className="admin-car-filters search-admin-filters" onSubmit={applyFilters}>
        <div className="admin-car-filters__head"><span className="admin-car-filters__head-icon" aria-hidden="true">☷</span><div><strong>Bộ lọc danh sách</strong><small>Thời gian và địa điểm tìm kiếm được giữ nguyên</small></div><span className="admin-car-filters__count">{Object.keys(appliedFilters).length} điều kiện đang áp dụng</span></div>
        <label><span>Thương hiệu</span><select value={filters.carBrandId} onChange={(event) => setFilters((current) => ({ ...current, carBrandId: event.target.value }))}><option value="">Tất cả thương hiệu</option>{brands.map((brand, index) => { const id = brand.carBrandId ?? brand.brandId ?? brand.id; return <option key={id ?? index} value={id}>{brand.nameBrand ?? brand.brandName ?? brand.name}</option> })}</select></label>
        <label><span>Năm sản xuất</span><input type="number" min="1900" max="2100" placeholder="Ví dụ: 2022" value={filters.productionYear} onChange={(event) => setFilters((current) => ({ ...current, productionYear: event.target.value }))} /></label>
        <label><span>Số chỗ</span><select value={filters.numSeats} onChange={(event) => setFilters((current) => ({ ...current, numSeats: event.target.value }))}><option value="">Tất cả</option><option value="5">5 chỗ</option><option value="7">7 chỗ</option></select></label>
        <label><span>Hộp số</span><select value={filters.transmission} onChange={(event) => setFilters((current) => ({ ...current, transmission: event.target.value }))}><option value="">Tất cả</option><option value="1">Số tự động</option><option value="2">Số sàn</option></select></label>
        <label><span>Nhiên liệu</span><select value={filters.typeFuel} onChange={(event) => setFilters((current) => ({ ...current, typeFuel: event.target.value }))}><option value="">Tất cả</option><option value="1">Xăng</option><option value="2">Dầu diesel</option><option value="3">Điện</option></select></label>
        <label><span>Mức tiêu hao</span><input type="number" min="0" step="0.1" placeholder="L/100km hoặc kWh" value={filters.fuelConsumption} onChange={(event) => setFilters((current) => ({ ...current, fuelConsumption: event.target.value }))} /></label>
        <label><span>Giá thuê/ngày</span><input type="number" min="0" step="any" placeholder="Nhập mức giá" value={filters.pricePerDay} onChange={(event) => setFilters((current) => ({ ...current, pricePerDay: event.target.value }))} /></label>
        <div className="admin-car-filters__actions"><span className="admin-car-filters__helper">Chọn tiêu chí rồi áp dụng để cập nhật danh sách xe.</span><div><button className="admin-car-clear" type="button" onClick={clearFilters}>Xóa bộ lọc</button><button className="admin-car-apply" type="submit">Áp dụng bộ lọc</button></div></div>
      </form>}
      </div>
      <div className="search-results-list__scroll">
      {error && <div className="admin-brand-error" role="alert">{error}<button type="button" onClick={() => loadCars({ nextFilters: appliedFilters })}>Thử lại</button></div>}
      {loading ? <div className="admin-brand-state">Đang tìm xe phù hợp…</div> : cars.length ? <div className="admin-car-grid search-admin-car-grid">{cars.map((car, index) => {
        const images = imageUrls(car)
        const id = carIdOf(car)
        const location = [car.district?.districtName ?? car.district?.name ?? car.districtName, car.province?.provinceName ?? car.province?.name ?? car.provinceName].filter(Boolean).join(', ')
        return <article className="admin-car-card" key={id ?? index}><div className="admin-car-card__cover"><button className="admin-car-card__photo" type="button" onClick={() => openDetail(car)} aria-label={`Xem chi tiết ${carNameOf(car)}`}>{images[0] ? <img src={images[0]} alt={carNameOf(car)} loading="lazy" /> : <span className="admin-car-card__empty-photo" aria-hidden="true">🚘</span>}</button><span className="admin-car-status admin-car-status--active">Đang hoạt động</span></div><div className="admin-car-card__body"><div className="admin-car-card__title-row"><div className="admin-car-card__title"><h3>{carNameOf(car)}</h3><p>{car.brandName ?? car.carBrand?.nameBrand ?? car.brand?.name ?? ''} <span>·</span> {car.productionYear || '—'}</p></div><div className="admin-car-card__price"><strong>{Number(car.pricePerDay || 0).toLocaleString('vi-VN')}đ</strong><span>/ ngày</span></div></div><div className="admin-car-card__specs"><span><b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 20v-2a5 5 0 0 1 10 0v2M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 20v-1a4 4 0 0 1 3-3.87M20 20v-1a4 4 0 0 0-3-3.87"/></svg></b>{car.numSeats ? `${car.numSeats} chỗ` : '—'}</span><span><b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4v7a4 4 0 0 0 4 4h2a3 3 0 0 1 3 3v2"/><circle cx="8" cy="4" r="2"/><path d="M8 9H5m3 0h3"/></svg></b>{Number(car.transmission) === 2 ? 'Số sàn' : 'Số tự động'}</span><span><b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3c2.2 3.2 5.5 6.7 5.5 11a5.5 5.5 0 0 1-11 0C6.5 9.7 9.8 6.2 12 3Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5"/></svg></b>{{ 1: 'Xăng', 2: 'Dầu diesel', 3: 'Điện' }[car.typeFuel] || '—'}</span></div><div className="admin-car-card__location"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg></span>{location || 'Chưa cập nhật địa điểm'}</div><div className="search-car-card__owner"><span aria-hidden="true"><DetailIcon type="user" /></span><small>Chủ xe</small><strong>{car.ownerName ?? car.owner?.displayName ?? car.owner?.name ?? '—'}</strong></div></div></article>
      })}</div> : !error && <div className="admin-brand-state"><strong>Không tìm thấy xe phù hợp</strong><span>Hãy thử thay đổi hoặc xóa bộ lọc.</span></div>}
      {!loading && hasMore && <button className="search-results-load-more" type="button" disabled={loadingMore} onClick={() => loadCars({ nextFilters: appliedFilters, offset: cars.length, append: true })}>{loadingMore ? 'Đang tải…' : 'Tải thêm xe'}</button>}
      </div>
    </section>
    {detail && <div className="admin-car-detail-backdrop search-car-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null) }}>
      <section className="admin-car-detail-modal" role="dialog" aria-modal="true" aria-labelledby="search-car-detail-title">
        <header className="admin-car-detail__header">
          <span className="admin-car-detail__header-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="m8 25 3.2-9.2a4 4 0 0 1 3.8-2.7h18a4 4 0 0 1 3.8 2.7L40 25v11h-4v-4H12v4H8V25Z"/><path d="M11 25h26M15 18h18M13 28h4m14 0h4"/></svg></span>
          <div className="admin-car-detail__header-copy"><span className="admin-module-card__eyebrow">HỒ SƠ XE #{carIdOf(detail) ?? ''}</span><h2 id="search-car-detail-title">{carNameOf(detail)}</h2><span className="admin-car-status admin-car-status--active">Đang hoạt động</span></div>
          <button className="admin-car-detail__close" type="button" aria-label="Đóng" onClick={() => setDetail(null)}>×</button>
        </header>
        {detailLoading ? <div className="admin-car-detail__state">Đang tải chi tiết xe…</div> : detailError ? <div className="admin-car-detail__state admin-car-detail__state--error" role="alert">{detailError}</div> : <div className="admin-car-detail__content">
          <section className="admin-car-gallery" aria-label="Thư viện ảnh xe"><div className="admin-car-gallery__heading"><h3>Hình ảnh xe</h3><span>{detailImages.length} ảnh</span></div>{detailImages.length ? <div className="admin-car-gallery__carousel"><img src={detailImages[detailImageIndex % detailImages.length]} alt={`${carNameOf(detail)} — ảnh ${detailImageIndex + 1}`} />{detailImages.length > 1 && <><button type="button" aria-label="Ảnh trước" onClick={() => setDetailImageIndex((value) => (value - 1 + detailImages.length) % detailImages.length)}>‹</button><button type="button" aria-label="Ảnh tiếp theo" onClick={() => setDetailImageIndex((value) => (value + 1) % detailImages.length)}>›</button><span>{detailImageIndex + 1} / {detailImages.length}</span></>}</div> : <div className="admin-car-gallery__empty"><span aria-hidden="true">▧</span>Xe chưa có ảnh</div>}</section>
          <div className="admin-car-detail__grid">
            <div><span><DetailIcon type="features" />Thương hiệu</span><strong>{detail.brandName ?? detail.carBrand?.nameBrand ?? detail.brand?.name ?? '—'}</strong></div>
            <div><span><DetailIcon type="year" />Năm sản xuất</span><strong>{detail.productionYear || '—'}</strong></div>
            <div><span><DetailIcon type="seats" />Số chỗ</span><strong>{detail.numSeats ? `${detail.numSeats} chỗ` : '—'}</strong></div>
            <div><span><DetailIcon type="gear" />Hộp số</span><strong>{Number(detail.transmission) === 2 ? 'Số sàn' : 'Số tự động'}</strong></div>
            <div><span><DetailIcon type="fuel" />Nhiên liệu</span><strong>{{ 1: 'Xăng', 2: 'Dầu diesel', 3: 'Điện' }[detail.typeFuel] || '—'}</strong></div>
            <div><span><DetailIcon type="fuel" />Mức tiêu hao</span><strong>{detail.fuelConsumption ? `${detail.fuelConsumption} / 100km` : '—'}</strong></div>
            <div><span><DetailIcon type="price" />Giá thuê mỗi ngày</span><strong>{Number(detail.pricePerDay || 0).toLocaleString('vi-VN')}đ</strong></div>
            <div><span><DetailIcon type="location" />Địa điểm</span><strong>{[detail.districtName, detail.provinceName].filter(Boolean).join(', ') || '—'}</strong></div>
            <div><span><DetailIcon type="user" />Chủ xe</span><strong>{detail.ownerName ?? detail.owner?.displayName ?? detail.owner?.name ?? '—'}</strong></div>
            <div><span><DetailIcon type="id" />Mã xe</span><strong>{carIdOf(detail) ?? '—'}</strong></div>
          </div>
          <section className="admin-car-detail__text admin-car-detail__features"><h3><DetailIcon type="features" />Tính năng xe</h3>{carFeatures(detail).length ? <div className="admin-car-feature-list">{carFeatures(detail).map((feature, index) => <span key={`${feature}-${index}`}><i aria-hidden="true">✓</i>{feature}</span>)}</div> : <p>Chưa cập nhật tính năng xe.</p>}</section>
          <section className="admin-car-detail__text"><h3><DetailIcon type="description" />Mô tả xe</h3><p>{detail.description || 'Chưa có mô tả.'}</p></section>
          <section className="admin-car-detail__text"><h3><DetailIcon type="policy" />Chính sách</h3><p>{detail.policy || 'Chưa có chính sách.'}</p></section>
        </div>}
      </section>
    </div>}
  </main>
}

export default SearchCarsPage
