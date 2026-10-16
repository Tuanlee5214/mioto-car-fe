import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildApiUrl } from '../../constants/api'
import { checkAuth } from '../../services/authService'
import HomePage from '../HomePage/HomePage'
import CarManagement from './CarManagement'
import CarBrandManagement from './CarBrandManagement'
import ProvinceManagement from './ProvinceManagement'
import DistrictManagement from './DistrictManagement'
import FeatureManagement from './FeatureManagement'
import VoucherManagement from './VoucherManagement'
import RoleManagement from './RoleManagement'
import UserManagement from './UserManagement'
import './AdminPage.css'

const adminModules = [
  { key: 'car', title: 'Quản lý xe', description: 'Thông tin xe và danh sách xe cho thuê.', icon: '🚘', permissions: [{ name: 'car:read', label: 'Đọc' }, { name: 'car:write', label: 'Ghi' }] },
  { key: 'car_brand', title: 'Thương hiệu xe', description: 'Danh sách và thông tin thương hiệu xe.', icon: '🏷️', permissions: [{ name: 'car_brand:read', label: 'Đọc' }, { name: 'car_brand:write', label: 'Ghi' }] },
  { key: 'province', title: 'Tỉnh thành', description: 'Quản lý các tỉnh và thành phố.', icon: '📍', permissions: [{ name: 'province:write', label: 'Ghi' }] },
  { key: 'district', title: 'Quận huyện', description: 'Quản lý các quận và huyện.', icon: '🗺️', permissions: [{ name: 'district:write', label: 'Ghi' }] },
  { key: 'feature', title: 'Tính năng xe', description: 'Quản lý các tính năng và tiện nghi của xe.', icon: '⚙️', permissions: [{ name: 'feature:write', label: 'Ghi' }] },
  { key: 'fee_policy', title: 'Chính sách phí', description: 'Quản lý các loại phí và chính sách áp dụng.', icon: '💳', permissions: [{ name: 'fee_policy:write', label: 'Ghi' }] },
  { key: 'voucher', title: 'Voucher', description: 'Quản lý mã giảm giá và chương trình ưu đãi.', icon: '🎟️', permissions: [{ name: 'voucher:write', label: 'Ghi' }] },
  { key: 'role', title: 'Vai trò', description: 'Quản lý vai trò và quyền trong hệ thống.', icon: '🔐', permissions: [{ name: 'role:read', label: 'Đọc' }, { name: 'role:write', label: 'Ghi' }] },
  { key: 'users', title: 'User', description: 'Danh sách và thông tin người dùng.', icon: '👥', permissions: [{ name: 'user_list:read', label: 'Đọc danh sách user' }] },
]

function hasSuperAdminAccess(value) {
  return value === true || value === 1 || value === 'true' || value === '1'
}

function AdminPage() {
  const navigate = useNavigate()
  const [authState, setAuthState] = useState({ loading: true, user: null, roles: [], isSuperAdmin: false, error: '' })
  const [activeModuleKey, setActiveModuleKey] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let mounted = true

    const loadAdminAccess = async () => {
      setAuthState((current) => ({ ...current, loading: true, error: '' }))
      const result = await checkAuth({ forceRefresh: true })
      if (!mounted) return

      if (result.authenticated == null && authState.user) {
        // Authorization must come from the latest checkauth response. If that
        // request fails, keep the profile visible but discard stale access.
        setAuthState((current) => ({
          ...current,
          loading: false,
          roles: [],
          isSuperAdmin: false,
          error: result.message || 'Không thể làm mới quyền truy cập.',
        }))
        return
      }

      if (!result.success || !result.authenticated) {
        setAuthState({
          loading: false,
          user: null,
          roles: [],
          error: result.message || 'Vui lòng đăng nhập để tiếp tục.',
        })
        return
      }

      const roles = Array.isArray(result.roles) ? result.roles : []
      const isSuperAdmin = hasSuperAdminAccess(result.isSuperAdmin ?? result.data?.isSuperAdmin)
      const permissionNames = new Set(roles.map((role) => role.name))
      const availableModules = isSuperAdmin
        ? adminModules
        : adminModules.filter((module) => (
          module.permissions.some(({ name }) => permissionNames.has(name))
        ))

      setAuthState({ loading: false, user: result.data, roles, isSuperAdmin, error: '' })
      setActiveModuleKey((current) => (
        availableModules.some(({ key }) => key === current) ? current : availableModules[0]?.key || ''
      ))
    }

    loadAdminAccess()
    return () => { mounted = false }
  }, [reloadKey])

  if (authState.loading) {
    return (
      <main className="admin-loading" aria-live="polite" aria-busy="true">
        <span className="admin-loading__spinner" aria-hidden="true" />
        <strong>Đang kiểm tra tài khoản và quyền quản trị</strong>
        <span>Vui lòng chờ trong giây lát…</span>
      </main>
    )
  }

  if (!authState.user) {
    return (
      <HomePage
        initialAuthPanel="login"
        adminLogin
        onAdminLoginSuccess={() => setReloadKey((key) => key + 1)}
        onAdminLoginCancel={() => navigate('/', { replace: true })}
      />
    )
  }

  const permissionNames = new Set(authState.roles.map((role) => role.name))
  const hasAnyPermission = permissionNames.size > 0
  if (!authState.isSuperAdmin && !hasAnyPermission) {
    return (
      <main className="admin-state-page">
        <section className="admin-state-card" role="alert">
          <span className="admin-state-card__icon" aria-hidden="true">⛔</span>
          <h1>403 · Không có quyền truy cập</h1>
          <p>Tài khoản của bạn chưa được cấp quyền quản trị. Hãy liên hệ quản trị viên nếu bạn cần quyền truy cập.</p>
          <Link className="admin-primary-link" to="/">Về trang đặt xe</Link>
        </section>
      </main>
    )
  }

  const visibleModules = authState.isSuperAdmin
    ? adminModules
    : adminModules.filter((module) => (
      module.permissions.some(({ name }) => permissionNames.has(name))
    ))
  const activeModule = visibleModules.find(({ key }) => key === activeModuleKey)
  const canReadCars = authState.isSuperAdmin || permissionNames.has('car:read')
  const carReadRole = authState.roles.find((role) => role.name === 'car:read')
  const canWriteCars = authState.isSuperAdmin || permissionNames.has('car:write')
  const canWriteCarBrands = authState.isSuperAdmin || permissionNames.has('car_brand:write')
  const canWriteProvinces = authState.isSuperAdmin || permissionNames.has('province:write')
  const canWriteDistricts = authState.isSuperAdmin || permissionNames.has('district:write')
  const canWriteFeatures = authState.isSuperAdmin || permissionNames.has('feature:write')
  const canWriteVouchers = authState.isSuperAdmin || permissionNames.has('voucher:write')
  const canReadUserRoles = authState.isSuperAdmin || permissionNames.has('user_role:read')
  const canWriteUserRoles = authState.isSuperAdmin || permissionNames.has('user_role:write')
  const userRoleReadDisplayName = authState.roles.find((role) => role.name === 'user_role:read')?.displayName || 'Đọc danh sách quyền người dùng'
  const refreshPermissions = () => {
    setAuthState((current) => ({ ...current, loading: true }))
    setReloadKey((key) => key + 1)
  }
  const adminName = authState.user.displayName || authState.user.name || 'Tài khoản'
  const adminAvatar = authState.user.avatarUrl
    || authState.user.avatar
    || authState.user.imageUrl
    || (authState.user.publicId ? buildApiUrl(`/images/profiles/${encodeURIComponent(authState.user.publicId)}`) : '')
  const adminInitial = adminName.trim().charAt(0).toUpperCase() || 'A'

  return (
    <div className="admin-app">
      <header className="admin-topbar">
        <Link
          className="admin-brand"
          to="/admin"
          aria-label="Mioto Admin - tải lại trang quản trị"
          onClick={(event) => {
            event.preventDefault()
            window.location.assign('/admin')
          }}
        >
          <span className="admin-brand__mark">M</span>
          <span>mioto <small>ADMIN</small></span>
        </Link>
        <div className="admin-topbar__account">
          <Link className="admin-topbar__profile" to="/profile" aria-label={`Mở hồ sơ ${adminName}`}>
            <span className="admin-user-avatar" aria-hidden="true">{adminAvatar && <img src={adminAvatar} alt="" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling.hidden = false }} />}<span hidden={Boolean(adminAvatar)}>{adminInitial}</span></span>
            <span className="admin-user-details">
              <strong>{adminName}</strong>
              <span>{authState.user.email || authState.user.phone || 'Quản trị viên'}</span>
            </span>
            <span className="admin-topbar__profile-hint">Hồ sơ <b aria-hidden="true">↗</b></span>
          </Link>
          <Link className="admin-back-link" to="/">Trang đặt xe <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__intro">
            <span>KHÔNG GIAN LÀM VIỆC</span>
            <h2>Quản trị hệ thống</h2>
          </div>
          {visibleModules.length ? (
            <nav className="admin-nav" aria-label="Các mục quản trị được cấp quyền">
              {visibleModules.map((module) => (
                <button
                  type="button"
                  key={module.key}
                  className={module.key === activeModuleKey ? 'admin-nav__item admin-nav__item--active' : 'admin-nav__item'}
                  aria-current={module.key === activeModuleKey ? 'page' : undefined}
                  onClick={() => setActiveModuleKey(module.key)}
                >
                  <span className="admin-nav__icon" aria-hidden="true">{module.icon}</span>
                  <span>{module.title}</span>
                  <span className="admin-nav__arrow" aria-hidden="true">›</span>
                </button>
              ))}
            </nav>
          ) : (
            <div className="admin-no-permissions">
              <span aria-hidden="true">◉</span>
              <strong>Chưa được cấp quyền quản trị</strong>
              <p>Tài khoản này hiện chưa có quyền quản lý tính năng nào.</p>
            </div>
          )}
          <div className="admin-sidebar__footer">
            <span className="admin-status-dot" /> Quyền được tải trực tiếp từ máy chủ
          </div>
        </aside>

        <main className="admin-main">
          {activeModule?.key === 'car' ? (
            canReadCars
              ? <CarManagement canWrite={canWriteCars} onRefreshPermissions={refreshPermissions} />
              : <section className="admin-brand-manager admin-module-access-message" aria-labelledby="car-read-required-title">
                <div className="admin-brand-manager__heading">
                  <div><span className="admin-module-card__eyebrow">QUẢN LÝ ĐỘI XE</span><h2 id="car-read-required-title">Danh sách xe</h2></div>
                  <button className="admin-refresh" type="button" onClick={refreshPermissions}><span aria-hidden="true">↻</span> Làm mới quyền</button>
                </div>
                <p role="alert">Bạn cần quyền “{carReadRole?.displayName || 'Đọc thông tin xe'}” để xem danh sách xe.</p>
              </section>
          ) : activeModule?.key === 'car_brand' ? (
            <CarBrandManagement canWrite={canWriteCarBrands} onRefreshPermissions={refreshPermissions} />
          ) : activeModule?.key === 'province' ? (
            <ProvinceManagement canWrite={canWriteProvinces} onRefreshPermissions={refreshPermissions} />
          ) : activeModule?.key === 'district' ? (
            <DistrictManagement canWrite={canWriteDistricts} onRefreshPermissions={refreshPermissions} />
          ) : activeModule?.key === 'feature' ? (
            <FeatureManagement canWrite={canWriteFeatures} onRefreshPermissions={refreshPermissions} />
          ) : activeModule?.key === 'voucher' ? (
            <VoucherManagement canWrite={canWriteVouchers} onRefreshPermissions={refreshPermissions} />
          ) : activeModule?.key === 'role' ? (
            <RoleManagement onRefreshPermissions={refreshPermissions} />
          ) : activeModule?.key === 'users' ? (
            <UserManagement canViewRoles={canReadUserRoles} canAssignRoles={canWriteUserRoles} readPermissionDisplayName={userRoleReadDisplayName} loggedInUserId={authState.user.userId} onRefreshPermissions={refreshPermissions} />
          ) : activeModule ? (
            <section className="admin-module-card" aria-labelledby="admin-module-title">
              <div className="admin-module-card__icon" aria-hidden="true">{activeModule.icon}</div>
              <div className="admin-module-card__body">
                <span className="admin-module-card__eyebrow">KHU VỰC ĐƯỢC CẤP QUYỀN</span>
                <h2 id="admin-module-title">{activeModule.title}</h2>
                <p>{activeModule.description}</p>
                <div className="admin-permission-list" aria-label="Quyền hiện có">
                  {activeModule.permissions
                    .filter(({ name }) => authState.isSuperAdmin || permissionNames.has(name))
                    .map(({ name, label }) => (
                      <span className="admin-permission-chip" key={name}>
                        <span aria-hidden="true">✓</span> {label} <code>{name}</code>
                      </span>
                    ))}
                </div>
                <div className="admin-module-notice">
                  <span aria-hidden="true">i</span>
                  <p>Khu vực này đã được bật theo quyền của bạn. Các thao tác quản lý sẽ được bổ sung tại đây.</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="admin-welcome-card">
              <span className="admin-welcome-card__icon" aria-hidden="true">✦</span>
              <h2>Chào mừng, {authState.user.displayName || 'quản trị viên'}</h2>
              <p>Chưa có mục quản trị nào được hiển thị vì tài khoản chưa được cấp quyền tương ứng.</p>
            </section>
          )}

        </main>
      </div>
    </div>
  )
}

export default AdminPage
