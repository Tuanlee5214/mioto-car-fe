import { apiRequest } from './apiClient'

const RESOURCE_URL = '/api/features'

function getApiError(result, fallbackMessage) {
  const apiError = result?.result?.error
  const requestSucceeded = result?.success && result?.response?.ok
    && (typeof apiError !== 'number' || apiError === 0)
  return requestSucceeded ? '' : result?.message || result?.result?.message || fallbackMessage
}

export async function getFeatures({ count = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  const result = await apiRequest(`${RESOURCE_URL}?${params.toString()}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải danh sách tính năng xe.')
  if (error) return { success: false, message: error }

  const payload = result.data
  const items = Array.isArray(payload)
    ? payload
    : [payload?.items, payload?.features, payload?.data].find(Array.isArray) || []
  return { success: true, data: items }
}

export async function createFeature(nameFeature, iconKey) {
  const result = await apiRequest(RESOURCE_URL, {
    method: 'POST',
    body: JSON.stringify({ nameFeature: String(nameFeature).trim(), iconKey: String(iconKey) }),
  })
  const error = getApiError(result, 'Không thể tạo tính năng xe.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function updateFeature(id, nameFeature, iconKey) {
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ nameFeature: String(nameFeature).trim(), iconKey: String(iconKey) }),
  })
  const error = getApiError(result, 'Không thể cập nhật tính năng xe.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}
