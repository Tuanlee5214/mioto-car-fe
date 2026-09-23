import { apiRequest } from './apiClient'

export async function getMyProfile() {
  const { success, data, message, status } = await apiRequest('/api/profile', {
    method: 'GET',
  })

  if (status === 401) {
    return {
      success: false,
      authenticated: false,
      message: message || 'Bạn chưa đăng nhập.',
    }
  }

  if (success && data) {
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
  const { success, data, message, status } = await apiRequest('/api/profile', {
    method: 'POST',
    body: JSON.stringify({
      email: String(email || '').trim(),
      displayName: String(displayName || '').trim(),
    }),
  })

  if (status === 401) {
    return {
      success: false,
      authenticated: false,
      message: message || 'Bạn chưa đăng nhập.',
    }
  }

  if (success && data) {
    return {
      success: true,
      data,
    }
  }

  return {
    success: false,
    message: message || 'Không thể cập nhật thông tin người dùng.',
  }
}
