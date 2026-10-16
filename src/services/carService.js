import { apiRequest } from './apiClient'

const ADMIN_CARS_URL = '/api/cars/admin'
const PUBLIC_CARS_URL = '/api/cars'

function unwrapCarList(payload) {
  if (Array.isArray(payload)) return payload
  return [payload?.items, payload?.cars, payload?.data, payload?.carList].find(Array.isArray) || []
}

function getRequestError(result, fallbackMessage) {
  const apiError = result?.result?.error
  const succeeded = result?.success && result?.response?.ok
    && (typeof apiError !== 'number' || apiError === 0)
  return succeeded ? '' : result?.message || result?.result?.message || fallbackMessage
}

export async function getAdminCars({ count = 20, offset = 0, filters = {} } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params.set(key, String(value))
  })

  const result = await apiRequest(`${ADMIN_CARS_URL}?${params.toString()}`, { method: 'GET' })
  const error = getRequestError(result, 'Không thể tải danh sách xe.')
  if (error) return { success: false, message: error }
  return { success: true, data: unwrapCarList(result.data) }
}

export async function getCars({ count = 20, offset = 0, filters = {}, startTime, endTime } = {}) {
  const params = new URLSearchParams({ count: String(count), offset: String(offset) })
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) params.set(key, String(value))
  })
  if (startTime !== undefined && startTime !== null) params.set('startTime', String(startTime))
  if (endTime !== undefined && endTime !== null) params.set('endTime', String(endTime))
  const result = await apiRequest(`${PUBLIC_CARS_URL}?${params.toString()}`, { method: 'GET' })
  const error = getRequestError(result, 'Không thể tìm danh sách xe.')
  if (error) return { success: false, message: error }
  return { success: true, data: unwrapCarList(result.data) }
}

export async function updateCarStatus(carId, status) {
  const result = await apiRequest(`/api/cars/${encodeURIComponent(carId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: Number(status) }),
  })
  const error = getRequestError(result, 'Không thể cập nhật trạng thái xe.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function getAdminCarById(carId) {
  const result = await apiRequest(`/api/cars/${encodeURIComponent(carId)}`, { method: 'GET' })
  const error = getRequestError(result, 'Không thể tải chi tiết xe.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function getMyCars({ count = 20, offset = 0 } = {}) {
  const safeCount = Number(count) > 0 && Number(count) <= 100 ? Number(count) : 20
  const safeOffset = Number(offset) >= 0 ? Number(offset) : 0
  const result = await apiRequest(`/api/cars/mine?count=${safeCount}&offset=${safeOffset}`, { method: 'GET' })
  const error = getRequestError(result, 'Không thể tải danh sách xe của bạn.')
  if (error) return { success: false, message: error }
  const payload = result.data
  return { success: true, data: Array.isArray(payload) ? payload : payload?.items || [] }
}

export async function createCar(car) {
  const result = await apiRequest('/api/cars', { method: 'POST', body: JSON.stringify(car) })
  const error = getRequestError(result, 'Không thể đăng ký xe.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function updateCar(carId, car) {
  const result = await apiRequest(`/api/cars/${encodeURIComponent(carId)}`, { method: 'PUT', body: JSON.stringify(car) })
  const error = getRequestError(result, 'Không thể cập nhật xe.')
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function uploadCarImage(file) {
  const result = await apiRequest('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  const error = getRequestError(result, 'Không thể tải ảnh lên.')
  if (error) return { success: false, message: error }
  const publicId = result.data?.publicId
  return publicId ? { success: true, data: publicId } : { success: false, message: 'Máy chủ không trả về mã ảnh.' }
}

async function mutateCarCollection(endpoint, method, body, fallbackMessage) {
  const result = await apiRequest(endpoint, { method, body: JSON.stringify(body) })
  const error = getRequestError(result, fallbackMessage)
  return error ? { success: false, message: error } : { success: true, data: result.data }
}

export async function addCarFeatures(carId, featureIds) {
  return mutateCarCollection('/api/car-features', 'POST', { carId: Number(carId), featureIds: featureIds.map(Number) }, 'Không thể thêm tính năng cho xe.')
}

export async function removeCarFeatures(carId, carFeatureIds) {
  return mutateCarCollection('/api/car-features', 'DELETE', { carId: Number(carId), carFeatureIds: carFeatureIds.map(Number) }, 'Không thể xóa tính năng khỏi xe.')
}

export async function addCarImages(carId, publicIds) {
  return mutateCarCollection('/api/car-images', 'POST', { carId: Number(carId), images: publicIds.map((publicId) => ({ publicId })) }, 'Không thể thêm ảnh cho xe.')
}

export async function removeCarImages(carId, imageIds) {
  return mutateCarCollection('/api/car-images', 'DELETE', { carId: Number(carId), imageIds: imageIds.map(Number) }, 'Không thể xóa ảnh khỏi xe.')
}

export async function getCarUnavails(carId) {
  const params = new URLSearchParams({ carId: String(carId) })
  const result = await apiRequest(`/api/car-unavails/?${params.toString()}`, { method: 'GET' })
  const error = getRequestError(result, 'Không thể tải lịch bận của xe.')
  if (error) return { success: false, message: error }
  const payload = result.data
  return { success: true, data: Array.isArray(payload) ? payload : payload?.items ?? payload?.data ?? payload?.unavails ?? [] }
}

export async function createCarUnavail(carId, startTime, endTime) {
  return mutateCarCollection('/api/car-unavails/', 'POST', {
    carId: Number(carId),
    startTime: Number(startTime),
    endTime: Number(endTime),
  }, 'Không thể tạo lịch bận cho xe.')
}

export async function deleteCarUnavail(carId, carUnavailId) {
  return mutateCarCollection('/api/car-unavails', 'DELETE', {
    carId: Number(carId),
    carUnavailId: Number(carUnavailId),
  }, 'Không thể xóa lịch bận của xe.')
}
