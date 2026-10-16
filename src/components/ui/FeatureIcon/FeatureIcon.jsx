import { FEATURE_ICON_OPTIONS } from './featureIconOptions'
import './FeatureIcon.css'

const featureIconMap = new Map(FEATURE_ICON_OPTIONS.map((option) => [option.key, option]))
const fallbackIcon = {
  paths: ['M12 3 14.8 9.2 21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8L12 3Z'],
}

function FeatureIcon({ iconKey, className = '' }) {
  const icon = featureIconMap.get(iconKey) || fallbackIcon

  return (
    <svg
      className={`feature-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon.paths.map((path) => <path key={path} d={path} />)}
      {icon.circles?.map(([cx, cy, r]) => <circle key={`${cx}-${cy}-${r}`} cx={cx} cy={cy} r={r} />)}
    </svg>
  )
}

export default FeatureIcon
