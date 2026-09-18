const LOGIN_API_URL = 'http://127.0.0.1:8081/api/login'
const SIGNUP_API_URL = 'http://127.0.0.1:8081/api/signup'
const LOGOUT_API_URL = 'http://127.0.0.1:8081/api/logout'

export async function loginUser({ phone, pwd }) {
  const response = await fetch(LOGIN_API_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: String(phone).trim(),
      pwd: String(pwd).trim(),
    }),
  })

  const result = await response.json()

  if (result && typeof result.error === 'number' && result.error >= 0) {
    return {
      success: true,
      data: result.data || {},
    }
  }

  return {
    success: false,
    message: result?.message || 'Đăng nhập thất bại.',
  }
}

export async function signUpUser({ phone, pwd, displayName, email }) {
  const response = await fetch(SIGNUP_API_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: String(phone).trim(),
      pwd: String(pwd).trim(),
      displayName: String(displayName).trim(),
      email: String(email).trim(),
    }),
  })

  const result = await response.json()

  if (result && typeof result.error === 'number' && result.error >= 0) {
    return {
      success: true,
      data: result.data || {},
    }
  }

  return {
    success: false,
    message: result?.message || 'Đăng ký thất bại.',
  }
}

export async function logoutUser() {
  const response = await fetch(LOGOUT_API_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  const result = await response.json()

  if (result && typeof result.error === 'number' && result.error >= 0) {
    return {
      success: true,
      data: result.data || 'logged out',
    }
  }

  return {
    success: false,
    message: result?.message || 'Đăng xuất thất bại.',
  }
}
