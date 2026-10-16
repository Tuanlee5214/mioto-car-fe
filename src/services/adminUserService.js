import { apiRequest } from './apiClient'

function getApiError(result, fallbackMessage) {
  const apiError = result?.result?.error
  const succeeded = result?.success && result?.response?.ok
    && (typeof apiError !== 'number' || apiError === 0)
  return succeeded ? '' : result?.message || result?.result?.message || fallbackMessage
}

export async function getUsers({ count = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  const result = await apiRequest(`/api/users?${params.toString()}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải danh sách người dùng.')
  if (error) return { success: false, message: error }

  const payload = result.data
  const items = Array.isArray(payload)
    ? payload
    : [payload?.items, payload?.users, payload?.data].find(Array.isArray) || []
  return { success: true, data: items, count: payload?.count, offset: payload?.offset }
}

export async function getUserById(userId) {
  const result = await apiRequest(`/api/users/${encodeURIComponent(userId)}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải thông tin người dùng.')
  if (error) return { success: false, message: error }
  const payload = result.data
  return { success: true, data: payload?.user || payload?.item || payload }
}

export async function getUserRoles(userId) {
  const result = await apiRequest(`/api/user-roles/${encodeURIComponent(userId)}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải danh sách quyền của người dùng.')
  if (error) return { success: false, message: error }
  return { success: true, data: result.data }
}

export async function assignUserRoles(userId, roleIds) {
  const result = await apiRequest('/api/user-roles', {
    method: 'POST',
    body: JSON.stringify({ userId: Number(userId), roleIds: [...new Set(roleIds.map(Number))] }),
  })
  const error = getApiError(result, 'Không thể gán quyền cho người dùng.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function removeUserRoles(userId, roleIds) {
  const result = await apiRequest('/api/user-roles', {
    method: 'DELETE',
    body: JSON.stringify({ userId: Number(userId), roleIds: [...new Set(roleIds.map(Number))] }),
  })
  const error = getApiError(result, 'Không thể xóa quyền của người dùng.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}
