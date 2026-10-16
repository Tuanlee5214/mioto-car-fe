import { CAR_BRAND_ICON_OPTIONS } from './carBrandIconOptions'
import './CarBrandIcon.css'

const carBrandIconMap = new Map(CAR_BRAND_ICON_OPTIONS.map((option) => [option.key, option]))

function CarBrandIcon({ iconKey, className = '' }) {
  if (!iconKey) return null

  const icon = carBrandIconMap.get(iconKey)

  if (icon) {
    return (
      <img
        className={`car-brand-icon ${className}`.trim()}
        src={`${import.meta.env.BASE_URL}car-brand-logos/${icon.key}.svg`}
        alt=""
        aria-hidden="true"
      />
    )
  }

  return (
    <svg
      className={`car-brand-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m3 14 1.5-4A2 2 0 0 1 6.4 8.7h11.2a2 2 0 0 1 1.9 1.3l1.5 4v4h-2v-2H5v2H3z" />
      <path d="M5 14h14" />
      <circle cx="7" cy="18" r="1" />
      <circle cx="17" cy="18" r="1" />
    </svg>
  )
}

export default CarBrandIcon
