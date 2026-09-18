export const getPhoneError = (value = '') => {
  const trimmed = String(value).trim()

  if (!trimmed) {
    return 'Số điện thoại không được để trống.'
  }

  if (/\D/.test(trimmed)) {
    return 'Số điện thoại không được chứa chữ hoặc ký tự đặc biệt.'
  }

  if (trimmed.length < 9 || trimmed.length > 15) {
    return 'Số điện thoại phải có từ 9 đến 15 chữ số.'
  }

  return ''
}

export const isValidPhone = (value = '') => !getPhoneError(value)

export const isValidDisplayName = (value = '') => /^[\p{L}\p{N}\s]+$/u.test(String(value).trim())

export const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())

export const isValidPassword = (value = '') => String(value).length >= 6

export const validateLoginForm = (form = {}) => {
  const errors = {}

  const phoneError = getPhoneError(form.phone)
  if (phoneError) {
    errors.phone = phoneError
  }

  if (!form.password) {
    errors.password = 'Mật khẩu không được để trống.'
  } else if (!isValidPassword(form.password)) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.'
  }

  return errors
}

export const validateSignUpForm = (form = {}) => {
  const errors = {}

  const phoneError = getPhoneError(form.phone)
  if (phoneError) {
    errors.phone = phoneError
  }

  if (!form.displayName.trim()) {
    errors.displayName = 'Tên hiển thị không được để trống.'
  } else if (!isValidDisplayName(form.displayName)) {
    errors.displayName = 'Tên hiển thị không được chứa ký tự đặc biệt.'
  }

  if (!form.email.trim()) {
    errors.email = 'Email không được để trống.'
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Email không đúng định dạng.'
  }

  if (!form.password) {
    errors.password = 'Mật khẩu không được để trống.'
  } else if (!isValidPassword(form.password)) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.'
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  }

  return errors
}
