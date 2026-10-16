import { apiRequest } from './apiClient'
import { buildApiUrl } from '../constants/api'
import { getCurrentUser, saveCurrentUser } from './authService'

const PROFILE_ENDPOINT = '/api/profiles'

function isSuccessfulResponse(result) {
  const apiError = result?.result?.error
  return result?.success
    && result.response?.ok
    && (typeof apiError !== 'number' || apiError >= 0)
}

function profileFromResponse(payload) {
  const profile = payload?.value ?? payload?.user ?? payload
  return profile && typeof profile === 'object' ? profile : {}
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
    const profile = profileFromResponse(data)
    if (profile && typeof profile === 'object') saveCurrentUser(profile)
    return {
      success: true,
      data: profile,
    }
  }

  return {
    success: false,
    message: message || 'Không thể lấy thông tin người dùng.',
  }
}

export async function updateMyProfile({ email, displayName, publicId }) {
  const images = publicId ? [{ publicId }] : undefined
  const result = await apiRequest(PROFILE_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      email: String(email || '').trim(),
      displayName: String(displayName || '').trim(),
      ...(images ? { images } : {}),
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
    const responseUser = data && typeof data === 'object' ? profileFromResponse(data) : {}
    const updatedUser = {
      ...(getCurrentUser() || {}),
      ...responseUser,
      displayName: responseUser.displayName ?? String(displayName || '').trim(),
      email: responseUser.email ?? String(email || '').trim(),
      ...(publicId ? {
        publicId: responseUser.publicId ?? publicId,
        imageUrl: responseUser.imageUrl ?? buildApiUrl(`/images/profiles/${encodeURIComponent(publicId)}`),
      } : {}),
    }
    saveCurrentUser(updatedUser)
    return { success: true, data: updatedUser }
  }

  return {
    success: false,
    message: message || result.result?.message || 'Không thể cập nhật thông tin người dùng.',
  }
}

export async function uploadProfileImage(file) {
  const result = await apiRequest('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  const error = result?.success && result?.response?.ok
    && (typeof result?.result?.error !== 'number' || result.result.error === 0)
    ? ''
    : result?.message || result?.result?.message || 'Không thể tải ảnh đại diện lên.'
  if (error) return { success: false, message: error }
  const publicId = result.data?.publicId
  return publicId
    ? { success: true, data: publicId }
    : { success: false, message: 'Máy chủ không trả về mã ảnh.' }
}
