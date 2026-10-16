import { apiRequest } from './apiClient'

const RESOURCE_URL = '/api/districts'

function getApiError(result, fallbackMessage) {
  const apiError = result?.result?.error
  const requestSucceeded = result?.success && result?.response?.ok
    && (typeof apiError !== 'number' || apiError === 0)
  return requestSucceeded ? '' : result?.message || result?.result?.message || fallbackMessage
}

export async function getDistricts(provinceId, { count = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(provinceId)}?${params}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải danh sách quận huyện.')
  if (error) return { success: false, message: error }

  const payload = result.data
  const items = Array.isArray(payload) ? payload : [payload?.items, payload?.districts, payload?.data].find(Array.isArray) || []
  return { success: true, data: items }
}

export async function createDistrict(nameDistrict, provinceId) {
  const result = await apiRequest(RESOURCE_URL, {
    method: 'POST',
    body: JSON.stringify({ nameDistrict: String(nameDistrict).trim(), provinceId: Number(provinceId) }),
  })
  const error = getApiError(result, 'Không thể tạo quận huyện.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function updateDistrict(id, nameDistrict) {
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ nameDistrict: String(nameDistrict).trim() }),
  })
  const error = getApiError(result, 'Không thể cập nhật quận huyện.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

