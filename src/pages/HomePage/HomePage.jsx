import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { checkAuth, getCurrentUser } from '../../services/authService'
import { getVoucherById, getVouchers } from '../../services/voucherService'
import { getProvinces } from '../../services/provinceService'
import { getDistricts } from '../../services/districtService'
import { getAdminCarById, getCars } from '../../services/carService'
import { buildApiUrl } from '../../constants/api'
import LoginForm from '../../components/auth/LoginForm/LoginForm'
import SignUpForm from '../../components/auth/SignUpForm/SignUpForm'
import '../AdminPage/AdminPage.css'
import './HomePage.css'

const provinceIdOf = (item) => item?.provinceId ?? item?.id
const provinceNameOf = (item) => item?.provinceName ?? item?.nameProvince ?? item?.name ?? ''
const districtIdOf = (item) => item?.districtId ?? item?.id
const districtNameOf = (item) => item?.districtName ?? item?.nameDistrict ?? item?.name ?? ''
const featuredCarId = (car) => car?.carId ?? car?.id
const featuredCarName = (car) => car?.carName ?? car?.nameCar ?? car?.modelName ?? car?.name ?? 'Xe'
const featuredCarImages = (car) => {
  const images = car?.images ?? car?.carImages ?? car?.imageUrls ?? car?.imageList ?? (car?.imageUrl ? [car.imageUrl] : [])
  return (Array.isArray(images) ? images : images ? [images] : []).map((image) => {
    const source = typeof image === 'string' ? image : image?.imageUrl ?? image?.url ?? image?.path ?? image?.imagePath ?? image?.src ?? image?.publicId
    if (!source) return ''
    if (/^(https?:|data:|blob:|\/\/)/i.test(source)) return source
    return buildApiUrl(source.startsWith('/') ? source : `/api/images/${source}`)
  }).filter(Boolean)
}
const featuredCarFuel = (car) => ({ 1: 'Xăng', 2: 'Dầu diesel', 3: 'Điện' })[Number(car?.typeFuel)] || '—'
const featuredCarTransmission = (car) => Number(car?.transmission) === 2 ? 'Số sàn' : 'Số tự động'
const featuredCarFeatures = (car) => {
  const features = car?.features ?? car?.carFeatures ?? car?.featureList ?? car?.carFeatureList ?? []
  return (Array.isArray(features) ? features : []).map((item) => typeof item === 'string' ? item : item?.featureName ?? item?.nameFeature ?? item?.feature?.nameFeature ?? item?.name ?? '').filter(Boolean)
}
const voucherIdOf = (voucher) => voucher?.voucherId ?? voucher?.id
const voucherImageOf = (voucher) => {
  const image = voucher?.imageUrl
  if (image) {
    if (image.startsWith('http') || image.startsWith('data:') || image.startsWith('blob:') || image.startsWith('//')) return image
    return buildApiUrl(image.startsWith('/') ? image : '/images/vouchers/' + image)
  }
  return voucher?.publicId ? buildApiUrl('/images/vouchers/' + voucher.publicId) : ''
}
const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=90',
    quote: 'Có những cung đường chỉ chờ bạn cầm lái và bắt đầu.',
  },
  {
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2000&q=90',
    quote: 'Chọn một chiếc xe hợp ý, để mỗi chuyến đi đều đáng nhớ.',
  },
  {
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=90',
    quote: 'Cuối tuần này, hãy để hành trình đưa bạn đến nơi mới.',
  },
]
const today = new Date()
const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const roundedStart = new Date()
roundedStart.setMinutes(roundedStart.getMinutes() < 30 ? 30 : 60, 0, 0)
const defaultStartDate = toDateKey(roundedStart)
const defaultStartTime = `${String(roundedStart.getHours()).padStart(2, '0')}:${String(roundedStart.getMinutes()).padStart(2, '0')}`
const defaultEndDate = toDateKey(new Date(
  roundedStart.getFullYear(),
  roundedStart.getMonth(),
  roundedStart.getDate() + 1,
))
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0')
  const minute = index % 2 === 0 ? '00' : '30'
  return `${hour}:${minute}`
})
const formatDate = (dateKey) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(`${dateKey}T00:00:00`))

function FeaturedCarDetailIcon({ type }) {
  const paths = {
    features: <><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="5"/></>,
    year: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m3 0h2m-7 3h2"/></>,
    seats: <><circle cx="9" cy="8" r="2.5"/><circle cx="17" cy="9" r="2"/><path d="M4 19a5 5 0 0 1 10 0m1-4a4 4 0 0 1 5 4"/></>,
    gear: <><path d="M8 4v7a4 4 0 0 0 4 4h2a3 3 0 0 1 3 3v2"/><circle cx="8" cy="4" r="2"/><path d="M8 9H5m3 0h3"/></>,
    fuel: <><path d="M12 3c2.2 3.2 5.5 6.7 5.5 11a5.5 5.5 0 0 1-11 0C6.5 9.7 9.8 6.2 12 3Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5"/></>,
    price: <><path d="M12 3v18m5-14H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></>,
    id: <><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16a2.7 2.7 0 0 1 5 0m3-5h3m-3 3h3"/></>,
    description: <><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v5h5M9 13h6m-6 4h6"/></>,
    policy: <><path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  }
  return <svg className="admin-car-detail-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[type] || paths.features}</svg>
}

function HomePage({ initialAuthPanel = '', adminLogin = false, onAdminLoginSuccess, onAdminLoginCancel }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, setToast] = useState({ type: '', message: '' })
  const [authPanel, setAuthPanel] = useState(initialAuthPanel)
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [selectedLocation, setSelectedLocation] = useState('Tất cả địa điểm')
  const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState('')
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [provincesLoading, setProvincesLoading] = useState(true)
  const [districtsLoading, setDistrictsLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [draftLocation, setDraftLocation] = useState('Tất cả địa điểm')
  const [draftProvinceId, setDraftProvinceId] = useState('')
  const [draftDistrict, setDraftDistrict] = useState('')
  const [draftDistrictId, setDraftDistrictId] = useState('')
  const [vouchers, setVouchers] = useState([])
  const [vouchersLoading, setVouchersLoading] = useState(true)
  const [voucherError, setVoucherError] = useState('')
  const [voucherReloadKey, setVoucherReloadKey] = useState(0)
  const [activeVoucher, setActiveVoucher] = useState(null)
  const [voucherDetailLoading, setVoucherDetailLoading] = useState(false)
  const [featuredCars, setFeaturedCars] = useState([])
  const [featuredCarsLoading, setFeaturedCarsLoading] = useState(true)
  const [featuredCarsError, setFeaturedCarsError] = useState('')
  const [featuredCarsReloadKey, setFeaturedCarsReloadKey] = useState(0)
  const [activeFeaturedCar, setActiveFeaturedCar] = useState(null)
  const [featuredCarLoading, setFeaturedCarLoading] = useState(false)
  const [featuredCarError, setFeaturedCarError] = useState('')
  const [featuredCarImageIndex, setFeaturedCarImageIndex] = useState(0)
  const [activeSlide, setActiveSlide] = useState(0)
  const pointerStartX = useRef(null)
  const voucherRowRef = useRef(null)
  const featuredCarsRowRef = useRef(null)
  const featuredCarRequestRef = useRef(0)
  const authCheckInFlight = useRef(false)
  const districtsCache = useRef(new Map())
  const [datePicker, setDatePicker] = useState(null)
  const [calendarMonth, setCalendarMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [searchForm, setSearchForm] = useState({
    startDate: defaultStartDate,
    startTime: defaultStartTime,
    endDate: defaultEndDate,
    endTime: '09:00',
  })

  useEffect(() => {
    let mounted = true
    const refreshSession = async () => {
      if (authCheckInFlight.current) return
      authCheckInFlight.current = true
      const result = await checkAuth({ forceRefresh: true })
      authCheckInFlight.current = false
      if (!mounted) return
      if (result.authenticated === true) setCurrentUser(result.data)
      else if (result.authenticated === false) setCurrentUser(null)
    }

    refreshSession()
    window.addEventListener('focus', refreshSession)
    return () => {
      mounted = false
      window.removeEventListener('focus', refreshSession)
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadProvinces = async () => {
      setProvincesLoading(true)
      setLocationError('')
      try {
        const all = []
        let offset = 0
        while (active) {
          const result = await getProvinces({ count: 100, offset })
          if (!result.success) throw new Error(result.message)
          all.push(...result.data)
          if (result.data.length < 100) break
          offset += result.data.length
        }
        if (active) setProvinces(all)
      } catch (error) {
        if (active) setLocationError(error.message || 'Không thể tải danh sách tỉnh/thành.')
      } finally {
        if (active) setProvincesLoading(false)
      }
    }
    loadProvinces()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!draftProvinceId) {
      setDistricts([])
      setDistrictsLoading(false)
      return undefined
    }
    if (districtsCache.current.has(String(draftProvinceId))) {
      setDistricts(districtsCache.current.get(String(draftProvinceId)))
      setDistrictsLoading(false)
      return undefined
    }
    let active = true
    const loadDistricts = async () => {
      setDistricts([])
      setDistrictsLoading(true)
      setLocationError('')
      try {
        const all = []
        let offset = 0
        while (active) {
          const result = await getDistricts(draftProvinceId, { count: 100, offset })
          if (!result.success) throw new Error(result.message)
          all.push(...result.data)
          if (result.data.length < 100) break
          offset += result.data.length
        }
        if (active) {
          districtsCache.current.set(String(draftProvinceId), all)
          setDistricts(all)
        }
      } catch (error) {
        if (active) setLocationError(error.message || 'Không thể tải danh sách thành phố/quận/huyện.')
      } finally {
        if (active) setDistrictsLoading(false)
      }
    }
    loadDistricts()
    return () => { active = false }
  }, [draftProvinceId])

  useEffect(() => {
    if (!toast.message) return undefined

    const timer = setTimeout(() => {
      setToast({ type: '', message: '' })
    }, 3500)

    return () => clearTimeout(timer)
  }, [toast.message])

  useEffect(() => {
    const initialToast = location.state?.toast
    if (!initialToast?.message) return

    // oxlint-disable-next-line react/set-state-in-effect
    setToast({ type: initialToast.type || 'success', message: initialToast.message })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.key, location.pathname, location.state, navigate])

  useEffect(() => {
    if (!locationDialogOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setLocationDialogOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [locationDialogOpen])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((slide) => (slide + 1) % heroSlides.length)
    }, 6000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    const loadVouchers = async () => {
      setVouchersLoading(true)
      setVoucherError('')
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
      } catch (loadError) {
        // Keep the last successful public voucher list if a request fails
        // temporarily (for example while the session cookie is changing).
        if (active) setVoucherError(loadError.message || 'Không thể tải danh sách voucher.')
      } finally { if (active) setVouchersLoading(false) }
    }
    loadVouchers()
    return () => { active = false }
  }, [currentUser?.userId, voucherReloadKey])

  useEffect(() => {
    let active = true
    const loadFeaturedCars = async () => {
      setFeaturedCarsLoading(true)
      setFeaturedCarsError('')
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      const all = []
      const seen = new Set()
      let offset = 0
      try {
        while (active) {
          const result = await getCars({ count: 20, offset, startTime: start.getTime(), endTime: end.getTime() })
          if (!result.success) throw new Error(result.message)
          const batch = result.data.map((item) => item?.car ? { ...item.car, ...item, images: item.images ?? item.car.images } : item)
          batch.forEach((car) => {
            const id = featuredCarId(car)
            if (id == null || seen.has(String(id))) return
            seen.add(String(id))
            all.push(car)
          })
          if (result.data.length < 20) break
          offset += result.data.length
        }
        if (active) setFeaturedCars(all)
      } catch (loadError) {
        if (active) {
          setFeaturedCars([])
          setFeaturedCarsError(loadError.message || 'Không thể tải danh sách xe nổi bật.')
        }
      } finally {
        if (active) setFeaturedCarsLoading(false)
      }
    }
    loadFeaturedCars()
    return () => { active = false }
  }, [featuredCarsReloadKey])

  useEffect(() => {
    if (!activeVoucher && !activeFeaturedCar) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveVoucher(null)
        setActiveFeaturedCar(null)
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [activeVoucher, activeFeaturedCar])

  const handleAuthSuccess = (user) => {
    setCurrentUser(user || getCurrentUser())
    setAuthPanel('')
    if (adminLogin) {
      onAdminLoginSuccess?.(user)
      return
    }
    setToast({ type: 'success', message: 'Đăng nhập thành công.' })
  }

  const handleSignUpSuccess = (user) => {
    setCurrentUser(user || getCurrentUser())
    setAuthPanel('')
    if (adminLogin) {
      onAdminLoginSuccess?.(user)
      return
    }
    setToast({ type: 'success', message: 'Đăng ký thành công.' })
  }

  const closeAuthPanel = () => {
    setAuthPanel('')
    if (adminLogin) onAdminLoginCancel?.()
  }

  const changeSlide = (direction) => {
    setActiveSlide((slide) => (slide + direction + heroSlides.length) % heroSlides.length)
  }

  const handleCarouselPointerDown = (event) => {
    pointerStartX.current = event.clientX
  }

  const handleCarouselPointerUp = (event) => {
    if (pointerStartX.current === null) return
    const distance = event.clientX - pointerStartX.current
    pointerStartX.current = null
    if (Math.abs(distance) > 45) changeSlide(distance < 0 ? 1 : -1)
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const startTime = new Date(`${searchForm.startDate}T${searchForm.startTime}:00`).getTime()
    const endTime = new Date(`${searchForm.endDate}T${searchForm.endTime}:00`).getTime()
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
      setToast({ type: 'error', message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' })
      return
    }
    const params = new URLSearchParams({ startTime: String(startTime), endTime: String(endTime), locationLabel: `${selectedDistrict ? `${selectedDistrict}, ` : ''}${selectedLocation}` })
    if (selectedProvinceId) params.set('provinceId', String(selectedProvinceId))
    if (selectedDistrictId) params.set('districtId', String(selectedDistrictId))
    navigate(`/cars/search?${params.toString()}`)
  }

  const copyVoucherCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setToast({ type: 'success', message: `Đã sao chép mã ${code}.` })
    } catch {
      setToast({ type: 'error', message: 'Không thể sao chép mã trên trình duyệt này.' })
    }
  }

  const openVoucherDetail = async (voucher) => {
    setActiveVoucher(voucher)
    setVoucherDetailLoading(true)
    try {
      const result = await getVoucherById(voucherIdOf(voucher))
      if (result.success) setActiveVoucher(result.data)
      else setToast({ type: 'error', message: result.message || 'Không thể tải thông tin voucher.' })
    } catch {
      setToast({ type: 'error', message: 'Không thể tải thông tin voucher.' })
    } finally { setVoucherDetailLoading(false) }
  }

  const scrollVoucherRow = (direction) => {
    voucherRowRef.current?.scrollBy({ left: direction * 360, behavior: 'smooth' })
  }

  const scrollFeaturedCarsRow = (direction) => {
    featuredCarsRowRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' })
  }

  const openFeaturedCar = (car) => {
    const requestId = ++featuredCarRequestRef.current
    setActiveFeaturedCar(car)
    setFeaturedCarImageIndex(0)
    setFeaturedCarLoading(true)
    setFeaturedCarError('')
    getAdminCarById(featuredCarId(car)).then((result) => {
      if (requestId !== featuredCarRequestRef.current) return
      if (!result.success) throw new Error(result.message)
      const payload = result.data?.car ? { ...result.data.car, ...result.data } : result.data?.item ?? result.data
      setActiveFeaturedCar(payload)
    }).catch((loadError) => {
      if (requestId === featuredCarRequestRef.current) setFeaturedCarError(loadError.message || 'Không thể tải chi tiết xe.')
    }).finally(() => {
      if (requestId === featuredCarRequestRef.current) setFeaturedCarLoading(false)
    })
  }

  const closeFeaturedCar = () => {
    featuredCarRequestRef.current += 1
    setActiveFeaturedCar(null)
    setFeaturedCarLoading(false)
    setFeaturedCarError('')
  }

  const openLocationDialog = () => {
    setDraftLocation(selectedLocation)
    setDraftProvinceId(selectedProvinceId)
    setDraftDistrict(selectedDistrict)
    setDraftDistrictId(selectedDistrictId)
    setLocationError('')
    setLocationDialogOpen(true)
  }

  const confirmLocation = () => {
    setSelectedLocation(draftLocation)
    setSelectedProvinceId(draftProvinceId)
    setSelectedDistrict(draftDistrict)
    setSelectedDistrictId(draftDistrictId)
    setLocationDialogOpen(false)
  }

  const openDatePicker = (field) => {
    const selectedDate = new Date(`${searchForm[`${field}Date`]}T00:00:00`)
    setCalendarMonth({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() })
    setDatePicker(field)
  }

  const shiftCalendarMonth = (offset) => {
    setCalendarMonth(({ year, month }) => {
      const nextMonth = new Date(year, month + offset, 1)
      return { year: nextMonth.getFullYear(), month: nextMonth.getMonth() }
    })
  }

  const selectCalendarDate = (dateKey) => {
    if (datePicker === 'start') {
      setSearchForm((current) => ({
        ...current,
        startDate: dateKey,
        ...(dateKey > current.endDate ? { endDate: dateKey } : {}),
      }))
    } else if (datePicker === 'end' && dateKey >= searchForm.startDate) {
      setSearchForm((current) => ({ ...current, endDate: dateKey }))
    }
  }

  const calendarDays = (() => {
    const firstWeekday = new Date(calendarMonth.year, calendarMonth.month, 1).getDay()
    const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate()
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ]
  })()
  const calendarMonthKey = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}`
  const calendarMinimumDate = datePicker === 'end' ? searchForm.startDate : toDateKey(today)
  const canGoToPreviousMonth = calendarMonthKey > calendarMinimumDate.slice(0, 7)
  const selectedPickerDate = datePicker ? searchForm[`${datePicker}Date`] : ''

  const userName = currentUser?.displayName || currentUser?.name || 'Tài khoản'
  const userAvatar = currentUser?.avatarUrl || currentUser?.avatar || currentUser?.imageUrl
  const avatarLetter = userName.trim().charAt(0).toUpperCase() || 'U'

  return (
    <div className="home-page">
      <header className="site-header">
        <a className="site-brand" href="/" aria-label="Mioto - Trang chủ">
          <span className="site-brand__mark">M</span>
          <span>mioto</span>
        </a>
        <nav className="site-navigation" aria-label="Điều hướng chính">
          {currentUser && <button className="site-navigation__link" type="button" onClick={() => navigate('/my-cars')}>Xe của tôi</button>}
        </nav>

        <div className="header-account">
          {currentUser ? (
            <div className="account-control">
              <button
                type="button"
                className="account-button"
                onClick={() => {
                  setAuthPanel('')
                  navigate('/profile')
                }}
              >
                {userAvatar
                  ? <img className="account-avatar" src={userAvatar} alt="" />
                  : <span className="account-avatar account-avatar--letter">{avatarLetter}</span>}
                <span className="account-name">{userName}</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="header-login"
                onClick={() => {
                  setAuthPanel(authPanel === 'login' ? '' : 'login')
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className="header-signup"
                onClick={() => {
                  setAuthPanel(authPanel === 'signup' ? '' : 'signup')
                }}
              >
                Đăng ký
              </button>
            </>
          )}
        </div>
      </header>

      {authPanel && (
        <div className="auth-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeAuthPanel()
        }}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
            <button
              type="button"
              className="auth-popover__close"
              aria-label="Đóng"
              onClick={closeAuthPanel}
            >
              ×
            </button>
            <h2 id="auth-modal-title" className="visually-hidden">
              {authPanel === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </h2>
            {authPanel === 'login' ? (
              <LoginForm
                onNavigateToSignUp={() => setAuthPanel('signup')}
                onSuccess={handleAuthSuccess}
              />
            ) : (
              <SignUpForm
                onNavigateToLogin={() => setAuthPanel('login')}
                onSuccess={handleSignUpSuccess}
              />
            )}
          </section>
        </div>
      )}

      {datePicker && (
        <div
          className="date-picker-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDatePicker(null)
          }}
        >
          <section className="date-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="date-picker-title">
            <div className="date-picker-heading">
              <div>
                <span className="date-picker-eyebrow">{datePicker === 'start' ? 'Nhận xe' : 'Trả xe'}</span>
                <h2 id="date-picker-title">Chọn ngày và giờ</h2>
              </div>
              <button type="button" className="date-picker-close" aria-label="Đóng" onClick={() => setDatePicker(null)}>×</button>
            </div>

            <div className="calendar-header">
              <button
                type="button"
                aria-label="Tháng trước"
                onClick={() => shiftCalendarMonth(-1)}
                disabled={!canGoToPreviousMonth}
              >
                ‹
              </button>
              <h3>
                {new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })
                  .format(new Date(calendarMonth.year, calendarMonth.month, 1))}
              </h3>
              <button type="button" aria-label="Tháng sau" onClick={() => shiftCalendarMonth(1)}>›</button>
            </div>

            <div className="calendar-grid" role="grid" aria-label="Lịch chọn ngày">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((weekday) => (
                <span className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</span>
              ))}
              {calendarDays.map((day, index) => {
                if (!day) return <span className="calendar-empty" role="gridcell" key={`empty-${index}`} />
                const dateKey = toDateKey(new Date(calendarMonth.year, calendarMonth.month, day))
                const isDisabled = dateKey < calendarMinimumDate
                const isSelected = dateKey === selectedPickerDate
                return (
                  <button
                    type="button"
                    role="gridcell"
                    key={dateKey}
                    className={isSelected ? 'calendar-day calendar-day--selected' : 'calendar-day'}
                    aria-label={formatDate(dateKey)}
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    onClick={() => selectCalendarDate(dateKey)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <label className="date-picker-time">
              <span>Giờ {datePicker === 'start' ? 'nhận xe' : 'trả xe'}</span>
              <select
                value={searchForm[`${datePicker}Time`]}
                onChange={(event) => setSearchForm((current) => ({
                  ...current,
                  [`${datePicker}Time`]: event.target.value,
                }))}
              >
                {timeOptions.map((time) => <option value={time} key={time}>{time}</option>)}
              </select>
              <small>Thời gian được chia theo mỗi 30 phút</small>
            </label>

            <div className="date-picker-actions">
              <button type="button" className="date-picker-cancel" onClick={() => setDatePicker(null)}>Hủy</button>
              <button type="button" className="date-picker-confirm" onClick={() => setDatePicker(null)}>Xác nhận</button>
            </div>
          </section>
        </div>
      )}

      {locationDialogOpen && createPortal(
        <div
          className="location-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLocationDialogOpen(false)
          }}
        >
          <section className="location-dialog" role="dialog" aria-modal="true" aria-labelledby="location-dialog-title">
            <header className="location-dialog__header">
              <div>
                <span className="date-picker-eyebrow">ĐIỂM ĐÓN XE</span>
                <h2 id="location-dialog-title">Bạn muốn nhận xe ở đâu?</h2>
                <p>Chọn tỉnh/thành phố, sau đó chọn quận/huyện nếu cần.</p>
              </div>
              <button type="button" className="date-picker-close" aria-label="Đóng" onClick={() => setLocationDialogOpen(false)}>×</button>
            </header>

            <div className="location-dialog__content">
              <div className="location-dialog__provinces" aria-label="Danh sách tỉnh thành">
                <button
                  type="button"
                  className={draftLocation === 'Tất cả địa điểm' ? 'location-dialog__province location-dialog__province--active' : 'location-dialog__province'}
                  onClick={() => {
                    setDraftLocation('Tất cả địa điểm')
                    setDraftProvinceId('')
                    setDraftDistrict('')
                    setDraftDistrictId('')
                  }}
                >
                  <span>Tất cả địa điểm</span><span aria-hidden="true">›</span>
                </button>
                {provinces.map((province, index) => {
                  const id = provinceIdOf(province)
                  const name = provinceNameOf(province)
                  return (
                  <button
                    key={id ?? `${name}-${index}`}
                    type="button"
                    className={String(draftProvinceId) === String(id) ? 'location-dialog__province location-dialog__province--active' : 'location-dialog__province'}
                    aria-pressed={String(draftProvinceId) === String(id)}
                    onClick={() => {
                      setDraftLocation(name)
                      setDraftProvinceId(String(id ?? ''))
                      setDraftDistrict('')
                      setDraftDistrictId('')
                      setDistricts([])
                      setLocationError('')
                    }}
                  >
                    <span>{name}</span><span aria-hidden="true">›</span>
                  </button>
                  )
                })}
              </div>

              <div className="location-dialog__districts">
                {draftLocation === 'Tất cả địa điểm' ? (
                  <div className="location-dialog__empty">
                    <span aria-hidden="true">⌖</span>
                    <strong>{provincesLoading ? 'Đang tải danh sách tỉnh/thành…' : 'Hiển thị xe ở mọi khu vực'}</strong>
                    <p>{provincesLoading ? 'Vui lòng chờ trong giây lát.' : 'Hoặc chọn một tỉnh/thành để xem thành phố, quận/huyện.'}</p>
                  </div>
                ) : (
                  <>
                    <div className="location-dialog__district-heading">
                      <h3>{draftLocation}</h3>
                      <span>Chọn cả tỉnh/thành hoặc một thành phố, quận/huyện</span>
                    </div>
                    <button
                      type="button"
                      className={draftDistrict ? 'location-dialog__whole-province' : 'location-dialog__whole-province location-dialog__whole-province--active'}
                      onClick={() => { setDraftDistrict(''); setDraftDistrictId('') }}
                    >
                      Toàn bộ {draftLocation}
                    </button>
                    <div className="location-dialog__district-list">
                      {districtsLoading ? <div className="location-dialog__loading" role="status"><span className="location-dialog__spinner" aria-hidden="true" />Đang tải thành phố, quận/huyện…</div> : districts.map((district, index) => {
                        const id = districtIdOf(district)
                        const name = districtNameOf(district)
                        return (
                        <button
                          key={id ?? `${name}-${index}`}
                          type="button"
                          className={String(draftDistrictId) === String(id) ? 'location-dialog__district location-dialog__district--active' : 'location-dialog__district'}
                          aria-pressed={String(draftDistrictId) === String(id)}
                          onClick={() => { setDraftDistrict(name); setDraftDistrictId(String(id ?? '')) }}
                        >
                          <span>{name}</span><span aria-hidden="true">{String(draftDistrictId) === String(id) ? '✓' : ''}</span>
                        </button>
                        )
                      })}
                    </div>
                  </>
                )}
                {locationError && <p className="location-dialog__error" role="alert">{locationError}</p>}
              </div>
            </div>

            <footer className="location-dialog__footer">
              <span>{draftDistrict ? `${draftDistrict}, ${draftLocation}` : draftLocation}</span>
              <div>
                <button type="button" className="date-picker-cancel" onClick={() => setLocationDialogOpen(false)}>Hủy</button>
                <button type="button" className="date-picker-confirm" onClick={confirmLocation}>Xác nhận</button>
              </div>
            </footer>
          </section>
        </div>,
        document.body,
      )}

      <main>
        <section
          className="search-hero"
          onPointerDown={handleCarouselPointerDown}
          onPointerUp={handleCarouselPointerUp}
          onPointerCancel={() => { pointerStartX.current = null }}
          aria-label="Cảm hứng cho chuyến đi"
          style={{ backgroundImage: `linear-gradient(90deg, rgba(9, 31, 29, 0.83) 0%, rgba(13, 44, 39, 0.72) 48%, rgba(15, 48, 41, 0.23) 100%), url("${heroSlides[activeSlide].image}")` }}
        >
          <button className="hero-slide-arrow hero-slide-arrow--previous" type="button" aria-label="Ảnh trước" onClick={() => changeSlide(-1)}>‹</button>
          <button className="hero-slide-arrow hero-slide-arrow--next" type="button" aria-label="Ảnh tiếp theo" onClick={() => changeSlide(1)}>›</button>
          <div className="search-hero__content">
            <span className="hero-eyebrow">Hành trình của bạn, theo cách của bạn</span>
            <h1>Chọn xe yêu thích.<br />Mở lối hành trình.</h1>
            <p className="hero-quote" key={activeSlide}>{heroSlides[activeSlide].quote}</p>

            <form className="booking-search" onSubmit={handleSearch}>
              <div className="booking-field booking-field--location">
                <span className="booking-field__icon booking-field__icon--location" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M19 10.2c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z" />
                    <circle cx="12" cy="10" r="2.4" />
                  </svg>
                </span>
                <div className="booking-field__body booking-location-control">
                  <span className="booking-field__label">Địa điểm nhận xe</span>
                  <button
                    className="booking-location-trigger"
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={locationDialogOpen}
                    onClick={openLocationDialog}
                  >
                    <span title={selectedDistrict ? `${selectedDistrict}, ${selectedLocation}` : selectedLocation}>
                      {selectedDistrict ? `${selectedDistrict}, ${selectedLocation}` : selectedLocation}
                    </span>
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
                  </button>
                </div>
              </div>
              <div className="booking-field booking-field--date">
                <span className="booking-field__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
                    <path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h2m4 0h2M8 17h2" />
                  </svg>
                </span>
                <button className="booking-field__body booking-date-trigger" type="button" onClick={() => openDatePicker('start')}>
                  <span className="booking-field__label">Bắt đầu</span>
                  <span className="booking-date-trigger__value">{formatDate(searchForm.startDate)}</span>
                  <span className="booking-date-trigger__time">{searchForm.startTime}</span>
                </button>
              </div>
              <div className="booking-field booking-field--date">
                <span className="booking-field__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
                    <path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h2m4 0h2M8 17h2" />
                  </svg>
                </span>
                <button className="booking-field__body booking-date-trigger" type="button" onClick={() => openDatePicker('end')}>
                  <span className="booking-field__label">Kết thúc</span>
                  <span className="booking-date-trigger__value">{formatDate(searchForm.endDate)}</span>
                  <span className="booking-date-trigger__time">{searchForm.endTime}</span>
                </button>
              </div>
              <button className="booking-search__submit" type="submit">
                <span aria-hidden="true">⌕</span> Tìm xe
              </button>
            </form>
            <div className="hero-trust"><span>✓</span> Thuê xe dễ dàng, an tâm trên mọi hành trình</div>
            <div className="hero-slide-dots" role="group" aria-label="Chọn ảnh nền">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.image}
                  type="button"
                  className={index === activeSlide ? 'hero-slide-dot hero-slide-dot--active' : 'hero-slide-dot'}
                  aria-label={`Xem ảnh ${index + 1}`}
                  aria-pressed={index === activeSlide}
                  onClick={() => setActiveSlide(index)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="listing-section" id="car-listings">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">Dành cho chuyến đi tiếp theo</span>
              <h2>Xe nổi bật</h2>
              <p>Những chiếc xe đang sẵn sàng cho chuyến đi hôm nay</p>
            </div>
            {featuredCars.length > 1 && <div className="featured-car-row-controls"><button type="button" aria-label="Xe trước" onClick={() => scrollFeaturedCarsRow(-1)}>‹</button><button type="button" aria-label="Xe tiếp theo" onClick={() => scrollFeaturedCarsRow(1)}>›</button></div>}
          </div>
          {featuredCarsLoading && !featuredCars.length ? <div className="featured-cars-state">Đang tải xe nổi bật…</div> : featuredCarsError ? <div className="featured-cars-state" role="alert">{featuredCarsError}<button type="button" onClick={() => setFeaturedCarsReloadKey((key) => key + 1)}>Thử tải lại</button></div> : featuredCars.length ? <div className="featured-car-row" ref={featuredCarsRowRef} aria-label="Danh sách xe nổi bật">{featuredCars.map((car, index) => {
            const name = featuredCarName(car)
            const image = featuredCarImages(car)[0]
            const location = [car.district?.districtName ?? car.district?.name ?? car.districtName, car.province?.provinceName ?? car.province?.name ?? car.provinceName].filter(Boolean).join(', ')
            const rating = Number(car.rating ?? car.averageRating ?? car.averageRate)
            const ratingCount = Number(car.ratingCount ?? car.reviewCount ?? car.numberOfReviews)
            return <article className="car-card featured-car-card" key={featuredCarId(car) ?? index} role="button" tabIndex={0} onClick={() => openFeaturedCar(car)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openFeaturedCar(car) } }} aria-label={`Xem chi tiết ${name}`}>
              <div className="car-card__image">
                {image ? <img src={image} alt={name} loading="lazy" /> : <span className="featured-car-card__placeholder" aria-hidden="true">🚘</span>}
                <span className="car-card__badge">Xe nổi bật</span>
              </div>
              <div className="car-card__details">
                <div className="car-card__type">{car.carBrand?.nameBrand ?? car.brandName ?? car.brand?.name ?? ''}{car.productionYear ? ` · ${car.productionYear}` : ''}</div>
                <h3>{name}</h3>
                <div className="car-card__location"><span aria-hidden="true">⌖</span> {location || 'Chưa cập nhật địa điểm'}</div>
                <div className="car-card__bottom">
                  <span className="car-card__rating">{Number.isFinite(rating) && rating > 0 ? <>★ {rating.toFixed(1)} <span>{ratingCount > 0 ? `(${ratingCount} đánh giá)` : ''}</span></> : `${featuredCarTransmission(car)} · ${featuredCarFuel(car)}`}</span>
                  <span className="car-card__price">{Number(car.pricePerDay || 0).toLocaleString('vi-VN')}đ <small>/ ngày</small></span>
                </div>
              </div>
            </article>
          })}</div> : <div className="featured-cars-state">Chưa có xe phù hợp với thời gian hôm nay.</div>}
          {activeFeaturedCar && <div className="admin-car-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFeaturedCar() }}>
            <section className="admin-car-detail-modal" role="dialog" aria-modal="true" aria-labelledby="home-featured-car-title">
              <header className="admin-car-detail__header">
                <span className="admin-car-detail__header-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="m8 25 3.2-9.2a4 4 0 0 1 3.8-2.7h18a4 4 0 0 1 3.8 2.7L40 25v11h-4v-4H12v4H8V25Z"/><path d="M11 25h26M15 18h18M13 28h4m14 0h4"/></svg></span>
                <div className="admin-car-detail__header-copy"><span className="admin-module-card__eyebrow">HỒ SƠ XE #{featuredCarId(activeFeaturedCar) ?? ''}</span><h2 id="home-featured-car-title">{featuredCarName(activeFeaturedCar)}</h2><span className="admin-car-status admin-car-status--active">Đang hoạt động</span></div>
                <button className="admin-car-detail__close" type="button" aria-label="Đóng chi tiết xe" onClick={closeFeaturedCar}>×</button>
              </header>
              {featuredCarLoading ? <div className="admin-car-detail__state">Đang tải chi tiết xe…</div> : featuredCarError ? <div className="admin-car-detail__state admin-car-detail__state--error" role="alert">{featuredCarError}</div> : <div className="admin-car-detail__content">
                {(() => {
                  const images = featuredCarImages(activeFeaturedCar)
                  return <section className="admin-car-gallery" aria-label="Thư viện ảnh xe"><div className="admin-car-gallery__heading"><h3>Hình ảnh xe</h3><span>{images.length} ảnh</span></div>{images.length ? <div className="admin-car-gallery__carousel"><img src={images[featuredCarImageIndex % images.length]} alt={`${featuredCarName(activeFeaturedCar)} — ảnh ${featuredCarImageIndex + 1}`} />{images.length > 1 && <><button type="button" aria-label="Ảnh trước" onClick={() => setFeaturedCarImageIndex((index) => (index - 1 + images.length) % images.length)}>‹</button><button type="button" aria-label="Ảnh tiếp theo" onClick={() => setFeaturedCarImageIndex((index) => (index + 1) % images.length)}>›</button><span>{featuredCarImageIndex + 1} / {images.length}</span></>}</div> : <div className="admin-car-gallery__empty"><span aria-hidden="true">▧</span>Xe chưa có ảnh</div>}</section>
                })()}
                <div className="admin-car-detail__grid">
                  <div><span><FeaturedCarDetailIcon type="features" />Thương hiệu</span><strong>{activeFeaturedCar.brandName ?? activeFeaturedCar.carBrand?.nameBrand ?? activeFeaturedCar.brand?.name ?? '—'}</strong></div>
                  <div><span><FeaturedCarDetailIcon type="year" />Năm sản xuất</span><strong>{activeFeaturedCar.productionYear || '—'}</strong></div>
                  <div><span><FeaturedCarDetailIcon type="seats" />Số chỗ</span><strong>{activeFeaturedCar.numSeats ? `${activeFeaturedCar.numSeats} chỗ` : '—'}</strong></div>
                  <div><span><FeaturedCarDetailIcon type="gear" />Hộp số</span><strong>{featuredCarTransmission(activeFeaturedCar)}</strong></div>
                  <div><span><FeaturedCarDetailIcon type="fuel" />Nhiên liệu</span><strong>{featuredCarFuel(activeFeaturedCar)}</strong></div>
                  <div><span><FeaturedCarDetailIcon type="fuel" />Mức tiêu hao</span><strong>{activeFeaturedCar.fuelConsumption ? `${activeFeaturedCar.fuelConsumption} / 100km` : '—'}</strong></div>
                  <div><span><FeaturedCarDetailIcon type="price" />Giá thuê mỗi ngày</span><strong>{Number(activeFeaturedCar.pricePerDay || 0).toLocaleString('vi-VN')}đ</strong></div>
                  <div><span><FeaturedCarDetailIcon type="location" />Địa điểm</span><strong>{[activeFeaturedCar.district?.districtName ?? activeFeaturedCar.districtName, activeFeaturedCar.province?.provinceName ?? activeFeaturedCar.provinceName].filter(Boolean).join(', ') || '—'}</strong></div>
                  <div><span><FeaturedCarDetailIcon type="user" />Chủ xe</span><strong>{activeFeaturedCar.ownerName ?? activeFeaturedCar.owner?.displayName ?? activeFeaturedCar.owner?.name ?? '—'}</strong></div>
                  <div><span><FeaturedCarDetailIcon type="id" />Mã xe</span><strong>{featuredCarId(activeFeaturedCar) ?? '—'}</strong></div>
                </div>
                <section className="admin-car-detail__text admin-car-detail__features"><h3><FeaturedCarDetailIcon type="features" />Tính năng xe</h3>{featuredCarFeatures(activeFeaturedCar).length ? <div className="admin-car-feature-list">{featuredCarFeatures(activeFeaturedCar).map((feature, index) => <span key={`${feature}-${index}`}><i aria-hidden="true">✓</i>{feature}</span>)}</div> : <p>Chưa cập nhật tính năng xe.</p>}</section>
                <section className="admin-car-detail__text"><h3><FeaturedCarDetailIcon type="description" />Mô tả xe</h3><p>{activeFeaturedCar.description || 'Chưa có mô tả.'}</p></section>
                <section className="admin-car-detail__text"><h3><FeaturedCarDetailIcon type="policy" />Chính sách</h3><p>{activeFeaturedCar.policy || 'Chưa có chính sách.'}</p></section>
              </div>}
            </section>
          </div>}
        </section>

        <section className="voucher-section" aria-labelledby="voucher-heading">
          <div className="voucher-section__heading">
            <div>
              <span className="section-eyebrow">Ưu đãi dành cho bạn</span>
              <h2 id="voucher-heading">Săn voucher, đi chơi thả ga</h2>
              <p>Lưu mã ưu đãi và áp dụng cho chuyến đi tiếp theo.</p>
            </div>
            <div className="voucher-section__tools"><span className="voucher-section__tag">ƯU ĐÃI CÓ HẠN</span><div className="voucher-row-controls"><button type="button" aria-label="Voucher trước" onClick={() => scrollVoucherRow(-1)}>‹</button><button type="button" aria-label="Voucher tiếp theo" onClick={() => scrollVoucherRow(1)}>›</button></div></div>
          </div>
          {vouchersLoading && !vouchers.length ? <div className="voucher-state">Đang tải ưu đãi…</div> : vouchers.length ? <div className="voucher-row" ref={voucherRowRef} aria-label="Danh sách voucher">
            {vouchers.map((voucher) => (
              <article className="voucher-card" key={voucherIdOf(voucher) ?? voucher.code}>
                <button className="voucher-card__image" type="button" onClick={() => openVoucherDetail(voucher)} aria-label={'Xem chi tiết ' + (voucher.title || 'voucher')}>
                  {voucherImageOf(voucher) ? <img src={voucherImageOf(voucher)} alt={voucher.title || 'Voucher Mioto'} loading="lazy" decoding="async" /> : <span aria-hidden="true">🎟️</span>}
                  <span className="voucher-card__image-hint">Xem ưu đãi</span>
                </button>
                <div className="voucher-card__content">
                  <div className="voucher-card__title-row"><h3>{voucher.title || 'Ưu đãi Mioto'}</h3>{voucher.discountPercent != null && <strong>{voucher.discountPercent}%</strong>}</div>
                  <p>{voucher.body || 'Khám phá ưu đãi dành cho chuyến đi tiếp theo của bạn.'}</p>
                  {voucher.code && <div className="voucher-card__action"><code>{voucher.code}</code><button type="button" onClick={() => copyVoucherCode(voucher.code)}>Sao chép mã</button></div>}
                </div>
              </article>
            ))}
          </div> : <div className="voucher-state">{voucherError ? <>{voucherError} <button type="button" onClick={() => setVoucherReloadKey((key) => key + 1)}>Thử tải lại</button></> : vouchersLoading ? 'Đang tải ưu đãi…' : 'Hiện chưa có ưu đãi nào. Hãy quay lại sau nhé.'}</div>}
          {activeVoucher && <div className="home-voucher-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveVoucher(null) }}><section className="home-voucher-detail" role="dialog" aria-modal="true" aria-labelledby="home-voucher-detail-title">
            <header><button type="button" aria-label="Đóng" onClick={() => setActiveVoucher(null)}>×</button></header>
            {voucherDetailLoading ? <div className="voucher-state">Đang tải thông tin voucher…</div> : <div className="home-voucher-detail__content">
              {voucherImageOf(activeVoucher) ? <img className="home-voucher-detail__image" src={voucherImageOf(activeVoucher)} alt={activeVoucher.title || 'Voucher Mioto'} /> : <div className="home-voucher-detail__image home-voucher-detail__image--empty">🎟️</div>}
              <h2 id="home-voucher-detail-title">{activeVoucher.title || 'Ưu đãi Mioto'}</h2>
              <div className="home-voucher-detail__accent" />
              <p>{activeVoucher.body || 'Chưa có nội dung voucher.'}</p>
            </div>}
          </section></div>}
        </section>

        <section className="how-it-works" id="how-it-works">
          <span className="how-it-works__eyebrow"><i aria-hidden="true">✦</i> HÀNH TRÌNH BẮT ĐẦU TẠI ĐÂY</span>
          <h2>Thuê xe thật dễ dàng</h2>
          <p className="how-it-works__intro">Từ lúc chọn xe đến khi bắt đầu chuyến đi, mọi thứ đều gọn trong vài bước.</p>
          <div className="steps-grid">
            <div className="step-card"><span>01</span><div className="step-card__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="m8 27 3-9a4 4 0 0 1 3.8-2.8h18.4A4 4 0 0 1 37 18l3 9v10h-5v-4H13v4H8V27Z"/><path d="M11 27h26M16 20h16M14 30h4m12 0h4"/><circle cx="34" cy="14" r="6"/><path d="m38.5 18.5 4 4"/></svg></div><h3>Tìm chiếc xe phù hợp</h3><p>Chọn địa điểm và thời gian cho chuyến đi của bạn.</p></div>
            <div className="step-card"><span>02</span><div className="step-card__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><rect x="9" y="12" width="30" height="27" rx="4"/><path d="M16 8v8m16-8v8M9 20h30m-22 8 5 5 10-10"/></svg></div><h3>Đặt xe nhanh chóng</h3><p>Chọn xe yêu thích và xác nhận yêu cầu đặt xe.</p></div>
            <div className="step-card"><span>03</span><div className="step-card__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M8 37c7-1 8-8 15-8s8 7 16 6"/><path d="M31 11c0 6-8 12-8 17a8 8 0 1 0 16 0c0-5-8-11-8-17Z"/><circle cx="31" cy="27" r="2.5"/><path d="M9 15h10m-10 6h7"/></svg></div><h3>Vi vu khám phá</h3><p>Nhận xe và tận hưởng hành trình theo cách riêng.</p></div>
          </div>
        </section>

      </main>
      <footer className="site-footer"><span className="site-brand__mark">M</span> © 2026 Mioto · Cùng bạn trên mọi hành trình</footer>
      {toast.message && (
        <div className={`auth-success-toast auth-success-toast--${toast.type}`} role="status">
          <span className="auth-success-toast__icon" aria-hidden="true">{toast.type === 'error' ? '!' : '✓'}</span>
          <p>{toast.message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setToast({ type: '', message: '' })}>×</button>
        </div>
      )}
    </div>
  )
}

export default HomePage
