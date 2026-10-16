import { apiRequest } from './apiClient'

const RESOURCE_URL = '/api/provinces'

function getApiError(result, fallbackMessage) {
  const apiError = result?.result?.error
  const requestSucceeded = result?.success && result?.response?.ok
    && (typeof apiError !== 'number' || apiError === 0)

  return requestSucceeded ? '' : result?.message || result?.result?.message || fallbackMessage
}

export async function getProvinces({ count = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  const result = await apiRequest(`${RESOURCE_URL}?${params.toString()}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải danh sách tỉnh thành.')
  if (error) return { success: false, message: error }

  const payload = result.data
  const items = Array.isArray(payload)
    ? payload
    : [payload?.items, payload?.provinces, payload?.data].find(Array.isArray) || []
  return { success: true, data: items }
}

export async function createProvince(nameProvince) {
  const result = await apiRequest(RESOURCE_URL, {
    method: 'POST',
    body: JSON.stringify({ nameProvince: String(nameProvince).trim() }),
  })
  const error = getApiError(result, 'Không thể tạo tỉnh thành.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function updateProvince(id, nameProvince) {
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ nameProvince: String(nameProvince).trim() }),
  })
  const error = getApiError(result, 'Không thể cập nhật tỉnh thành.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

