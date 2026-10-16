import { apiRequest } from './apiClient'

const RESOURCE_URL = '/api/vouchers'

function requestError(result, fallbackMessage) {
  const apiError = result?.result?.error
  const succeeded = result?.success && result?.response?.ok
    && (typeof apiError !== 'number' || apiError === 0)
  return succeeded ? '' : result?.message || result?.result?.message || fallbackMessage
}

function unwrapVoucherList(payload) {
  if (Array.isArray(payload)) return payload
  return [payload?.items, payload?.vouchers, payload?.data].find(Array.isArray) || []
}

export async function getVouchers({ count = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  const result = await apiRequest(`${RESOURCE_URL}?${params}`, { method: 'GET' })
  const error = requestError(result, 'Không thể tải danh sách voucher.')
  return error ? { success: false, message: error } : { success: true, data: unwrapVoucherList(result.data) }
}

export async function getVoucherById(voucherId) {
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(voucherId)}`, { method: 'GET' })
  const error = requestError(result, 'Không thể tải thông tin voucher.')
  return error ? { success: false, message: error } : { success: true, data: result.data?.voucher ?? result.data }
}

export async function createVoucher(voucher) {
  const result = await apiRequest(RESOURCE_URL, { method: 'POST', body: JSON.stringify(voucher) })
  const error = requestError(result, 'Không thể tạo voucher.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function updateVoucher(voucherId, voucher) {
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(voucherId)}`, { method: 'PUT', body: JSON.stringify(voucher) })
  const error = requestError(result, 'Không thể cập nhật voucher.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function deleteVoucher(voucherId) {
  const result = await apiRequest(`${RESOURCE_URL}/${encodeURIComponent(voucherId)}`, { method: 'DELETE' })
  const error = requestError(result, 'Không thể xóa voucher.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function uploadVoucherImage(file) {
  const result = await apiRequest('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  const error = requestError(result, 'Không thể tải ảnh voucher lên.')
  if (error) return { success: false, message: error }
  const publicId = result.data?.publicId
  return publicId ? { success: true, data: publicId } : { success: false, message: 'Máy chủ không trả về mã ảnh.' }
}
