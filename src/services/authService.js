import { buildApiUrl } from '../constants/api'

const LOGIN_API_URL = buildApiUrl('/api/login')
const SIGNUP_API_URL = buildApiUrl('/api/signup')
const LOGOUT_API_URL = buildApiUrl('/api/logout')
const CHECK_AUTH_API_URL = buildApiUrl('/api/checkauth')

export function saveCurrentUser(user) {
  if (!user) return

  const normalizedUser = {
    ...user,
    userId: user.userId ?? user.id ?? Number(localStorage.getItem('userId')) ?? 6,
  }

  localStorage.setItem('userId', String(normalizedUser.userId))
  localStorage.setItem('currentUser', JSON.stringify(normalizedUser))
}

export function getCurrentUser() {
  try {
    const user = localStorage.getItem('currentUser')
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

function clearCurrentUser() {
  localStorage.removeItem('userId')
  localStorage.removeItem('currentUser')
}

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
    const user = result?.data || {}
    const normalizedUser = {
      ...user,
      userId: user.userId ?? user.id ?? Number(localStorage.getItem('userId')) ?? 6,
    }

    saveCurrentUser(normalizedUser)

    return {
      success: true,
      data: normalizedUser,
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
    const user = result?.data || {}
    const normalizedUser = {
      ...user,
      userId: user.userId ?? user.id ?? Number(localStorage.getItem('userId')) ?? 6,
    }

    saveCurrentUser(normalizedUser)

    return {
      success: true,
      data: normalizedUser,
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

  clearCurrentUser()

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

export async function checkAuth() {
  try {
    const response = await fetch(CHECK_AUTH_API_URL, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (response.status === 401 || result?.status === 401 || result?.error === 401) {
      clearCurrentUser()
      return {
        success: false,
        authenticated: false,
        message: result?.message || 'Unauthorized',
      }
    }

    if (result && typeof result.error === 'number' && result.error >= 0) {
      const user = result?.data || {}
      const normalizedUser = {
        ...user,
        userId: user.userId ?? user.id ?? Number(localStorage.getItem('userId')) ?? 6,
      }

      saveCurrentUser(normalizedUser)

      return {
        success: true,
        authenticated: true,
        data: normalizedUser,
      }
    }

    return {
      success: false,
      authenticated: false,
      message: result?.message || 'Không xác thực được phiên làm việc.',
    }
  } catch (error) {
    clearCurrentUser()
    return {
      success: false,
      authenticated: false,
      message: 'Không thể kết nối máy chủ.',
    }
  }
}

