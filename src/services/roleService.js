import { apiRequest } from './apiClient'

const RESOURCE_URL = '/api/roles'

function getApiError(result, fallbackMessage) {
  const apiError = result?.result?.error
  const requestSucceeded = result?.success && result?.response?.ok
    && (typeof apiError !== 'number' || apiError === 0)
  return requestSucceeded ? '' : result?.message || result?.result?.message || fallbackMessage
}

export async function getRoles({ count = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  const result = await apiRequest(`${RESOURCE_URL}?${params.toString()}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải danh sách vai trò.')
  if (error) return { success: false, message: error }

  const payload = result.data
  const items = Array.isArray(payload)
    ? payload
    : [payload?.items, payload?.roles, payload?.data].find(Array.isArray) || []
  return { success: true, data: items }
}
