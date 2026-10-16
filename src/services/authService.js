import { buildApiUrl } from '../constants/api'

const LOGIN_API_URL = buildApiUrl('/api/login')
const SIGNUP_API_URL = buildApiUrl('/api/signup')
const LOGOUT_API_URL = buildApiUrl('/api/logout')
const CHECK_AUTH_API_URL = buildApiUrl('/api/checkauth')
let checkAuthRequest = null

function getFallbackUserId() {
  return Number(localStorage.getItem('userId')) || 6
}

export function saveCurrentUser(user) {
  if (!user) return

  const normalizedUser = {
    ...user,
    userId: user.userId ?? user.id ?? getFallbackUserId(),
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
      userId: user.userId ?? user.id ?? getFallbackUserId(),
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
      userId: user.userId ?? user.id ?? getFallbackUserId(),
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

export function checkAuth({ forceRefresh = false } = {}) {
  if (forceRefresh) return requestCheckAuth()

  if (!checkAuthRequest) {
    checkAuthRequest = requestCheckAuth().finally(() => {
      checkAuthRequest = null
    })
  }
  return checkAuthRequest
}

async function requestCheckAuth() {
  try {
    const response = await fetch(CHECK_AUTH_API_URL, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
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

    const payload = result?.data || {}
    const user = payload.user || payload
    const hasUserIdentity = ['userId', 'id', 'phone', 'email', 'displayName'].some((key) => user?.[key] != null)

    if (response.status === 403 || result?.status === 403 || result?.error === 403) {
      const sessionUser = hasUserIdentity ? user : getCurrentUser()
      if (sessionUser) {
        const normalizedUser = {
          ...sessionUser,
          userId: sessionUser.userId ?? sessionUser.id ?? getFallbackUserId(),
        }
        saveCurrentUser(normalizedUser)
        return {
          success: true,
          authenticated: true,
          data: normalizedUser,
          isSuperAdmin: payload.isSuperAdmin,
          roles: Array.isArray(payload.roles) ? payload.roles : [],
        }
      }
    }

    if ((response.ok && result?.error === 0) || hasUserIdentity) {
      const roles = Array.isArray(payload.roles) ? payload.roles : []
      const normalizedUser = {
        ...user,
        userId: user.userId ?? user.id ?? getFallbackUserId(),
      }

      saveCurrentUser(normalizedUser)

      return {
        success: true,
        authenticated: true,
        data: normalizedUser,
        isSuperAdmin: payload.isSuperAdmin,
        // Keep authorization data in memory; always refresh it from checkauth.
        roles,
      }
    }

    return {
      success: false,
      authenticated: null,
      message: result?.message || 'Không xác thực được phiên làm việc.',
    }
  } catch {
    return {
      success: false,
      authenticated: null,
      message: 'Không thể kết nối máy chủ.',
    }
  }
}

