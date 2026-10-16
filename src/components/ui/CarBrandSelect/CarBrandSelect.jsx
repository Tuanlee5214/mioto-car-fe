import { useEffect, useId, useRef, useState } from 'react'
import CarBrandIcon from '../CarBrandIcon/CarBrandIcon'
import './CarBrandSelect.css'

function getBrandId(brand) {
  return brand?.carBrandId ?? brand?.brandId ?? brand?.id
}

function getBrandName(brand) {
  return brand?.nameBrand ?? brand?.brandName ?? brand?.name ?? 'Thương hiệu'
}

function CarBrandSelect({
  brands,
  value,
  onChange,
  label = 'Thương hiệu',
  placeholder = 'Tất cả thương hiệu',
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectId = useId()
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const focusOptionOnOpenRef = useRef(false)
  const selectedBrand = brands.find((brand) => String(getBrandId(brand)) === String(value))
  const selectedLabel = selectedBrand ? getBrandName(selectedBrand) : placeholder

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && focusOptionOnOpenRef.current) {
      const selectedIndex = brands.findIndex((brand) => String(getBrandId(brand)) === String(value))
      optionRefs.current[selectedIndex < 0 ? 0 : selectedIndex + 1]?.focus()
      focusOptionOnOpenRef.current = false
    }
  }, [brands, isOpen, value])

  const closeMenu = (restoreFocus = false) => {
    setIsOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      closeMenu(true)
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()

    if (!isOpen) {
      focusOptionOnOpenRef.current = true
      setIsOpen(true)
      return
    }

    const optionCount = brands.length + 1
    const focusedIndex = optionRefs.current.indexOf(document.activeElement)
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = focusedIndex < 0
      ? (direction > 0 ? 0 : optionCount - 1)
      : (focusedIndex + direction + optionCount) % optionCount
    optionRefs.current[nextIndex]?.focus()
  }

  const selectBrand = (brandId) => {
    onChange(brandId)
    closeMenu(true)
  }

  return (
    <div
      className="car-brand-select"
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setIsOpen(false)
      }}
      onKeyDown={handleKeyDown}
    >
      <button
        className="car-brand-select__trigger"
        id={selectId}
        type="button"
        aria-label={`${label}: ${selectedLabel}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${selectId}-options`}
        aria-required={required || undefined}
        ref={triggerRef}
        onClick={() => setIsOpen((open) => !open)}
      >
        {selectedBrand && <CarBrandIcon iconKey={selectedBrand.iconKey} className="car-brand-icon--filter" />}
        <span className="car-brand-select__selected-label">{selectedLabel}</span>
        <svg className="car-brand-select__chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>
      {isOpen && (
        <div
          className="car-brand-select__options"
          id={`${selectId}-options`}
          role="listbox"
          aria-label={label}
        >
          <button
            className="car-brand-select__option"
            type="button"
            role="option"
            aria-selected={!selectedBrand}
            ref={(element) => { optionRefs.current[0] = element }}
            onClick={() => selectBrand('')}
          >
            <span className="car-brand-select__all-icon" aria-hidden="true">✦</span>
            <span>{placeholder}</span>
          </button>
          {brands.map((brand, index) => {
            const brandId = getBrandId(brand)
            const isSelected = String(brandId) === String(value)
            return (
              <button
                className={`car-brand-select__option${isSelected ? ' is-selected' : ''}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                key={brandId ?? index}
                ref={(element) => { optionRefs.current[index + 1] = element }}
                onClick={() => selectBrand(String(brandId ?? ''))}
              >
                <CarBrandIcon iconKey={brand.iconKey} className="car-brand-icon--filter" />
                <span>{getBrandName(brand)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CarBrandSelect
