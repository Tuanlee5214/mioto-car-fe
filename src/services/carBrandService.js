import { apiRequest } from './apiClient'

const RESOURCE_URL = '/api/car-brands'

function getApiError(result, fallbackMessage) {
  const apiError = result?.result?.error
  const requestSucceeded = result?.success && result?.response?.ok
    && (typeof apiError !== 'number' || apiError === 0)

  return requestSucceeded
    ? ''
    : result?.message || result?.result?.message || fallbackMessage
}

export async function getCarBrands({ count = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  const result = await apiRequest(`${RESOURCE_URL}?${params.toString()}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải danh sách thương hiệu xe.')

  if (error) return { success: false, message: error }

  const payload = result.data
  const items = Array.isArray(payload)
    ? payload
    : [payload?.items, payload?.carBrands, payload?.brands, payload?.data].find(Array.isArray) || []
  return { success: true, data: items }
}

export async function getCarBrandById(id) {
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(id)}`, { method: 'GET' })
  const error = getApiError(result, 'Không thể tải thông tin thương hiệu xe.')

  if (error) return { success: false, message: error }
  return { success: true, data: result.data }
}

export async function createCarBrand(nameBrand, iconKey) {
  const result = await apiRequest(RESOURCE_URL, {
    method: 'POST',
    body: JSON.stringify({ nameBrand: String(nameBrand).trim(), iconKey: String(iconKey) }),
  })
  const error = getApiError(result, 'Không thể tạo thương hiệu xe.')

  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function updateCarBrand(id, nameBrand, iconKey) {
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ nameBrand: String(nameBrand).trim(), iconKey: String(iconKey) }),
  })
  const error = getApiError(result, 'Không thể cập nhật thương hiệu xe.')

  return error ? { success: false, message: error } : { success: true, data: result.data }
}
