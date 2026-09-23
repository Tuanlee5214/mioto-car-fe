import { buildApiUrl } from '../constants/api'

export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(buildApiUrl(endpoint), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const text = await response.text()
  const result = text ? JSON.parse(text) : null

  if (response.status === 401 || result?.status === 401 || result?.error === 401) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login')
      window.location.replace('/login')
    }

    return {
      success: false,
      authenticated: false,
      status: 401,
      response,
      data: result?.data,
      message: result?.message || 'Unauthorized',
    }
  }

  return {
    success: true,
    authenticated: true,
    status: response.status,
    response,
    data: result?.data,
    message: result?.message,
    result,
  }
}
