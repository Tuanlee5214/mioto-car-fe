const PROFILE_API_URL = 'http://localhost:8081/api/profile'

export async function getMyProfile() {
  const response = await fetch(PROFILE_API_URL, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
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
    message: result?.message || 'Không thể lấy thông tin người dùng.',
  }
}

export async function updateMyProfile({ email, displayName }) {
  const response = await fetch(PROFILE_API_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: String(email || '').trim(),
      displayName: String(displayName || '').trim(),
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
    message: result?.message || 'Không thể cập nhật thông tin người dùng.',
  }
}
