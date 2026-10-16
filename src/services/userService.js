import { apiRequest } from './apiClient'
import { getCurrentUser, saveCurrentUser } from './authService'

const PROFILE_ENDPOINT = '/api/profiles'

function isSuccessfulResponse(result) {
  const apiError = result?.result?.error
  return result?.success
    && result.response?.ok
    && (typeof apiError !== 'number' || apiError >= 0)
}

export async function getMyProfile() {
  const result = await apiRequest(PROFILE_ENDPOINT, {
    method: 'GET',
  })
  const { data, message, status } = result

  if (status === 401) {
    return {
      success: false,
      authenticated: false,
      message: message || 'Bạn chưa đăng nhập.',
    }
  }

  if (isSuccessfulResponse(result) && data) {
    return {
      success: true,
      data,
    }
  }

  return {
    success: false,
    message: message || 'Không thể lấy thông tin người dùng.',
  }
}

export async function updateMyProfile({ email, displayName }) {
  const result = await apiRequest(PROFILE_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      email: String(email || '').trim(),
      displayName: String(displayName || '').trim(),
    }),
  })

  const { data, message, status } = result

  if (status === 401) {
    return {
      success: false,
      authenticated: false,
      message: message || 'Bạn chưa đăng nhập.',
    }
  }

  if (isSuccessfulResponse(result)) {
    const responseUser = data && typeof data === 'object' ? data : {}
    const updatedUser = {
      ...(getCurrentUser() || {}),
      ...responseUser,
      displayName: responseUser.displayName ?? String(displayName || '').trim(),
      email: responseUser.email ?? String(email || '').trim(),
    }
    saveCurrentUser(updatedUser)
    return { success: true, data: updatedUser }
  }

  return {
    success: false,
    message: message || result.result?.message || 'Không thể cập nhật thông tin người dùng.',
  }
}
