# Mioto — Ứng dụng thuê xe

Giao diện web Mioto giúp người dùng tìm kiếm xe cho thuê, quản lý thông tin cá nhân và đăng xe cho thuê. Ứng dụng cũng cung cấp khu vực quản trị để quản lý dữ liệu và quyền truy cập.

## Tính năng

### Dành cho người dùng

- Đăng ký, đăng nhập và đăng xuất.
- Tìm kiếm xe và lọc theo các tiêu chí.
- Xem thông tin chi tiết xe, hình ảnh và thông tin chủ xe.
- Quản lý hồ sơ cá nhân, bao gồm cập nhật ảnh đại diện.
- Đăng ký xe cho thuê, chỉnh sửa thông tin xe, hình ảnh và tính năng.
- Quản lý lịch xe bận theo ngày hoặc theo giờ.

### Dành cho quản trị viên

- Quản lý xe, thương hiệu xe, tỉnh thành, quận huyện và tính năng.
- Quản lý voucher, vai trò và quyền người dùng.
- Tra cứu danh sách người dùng, xem hồ sơ và quản lý vai trò theo quyền được cấp.

## Công nghệ

- React 19
- React Router 7
- Vite 8
- Oxlint
- JavaScript (ES modules)

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+
- npm
- Backend Mioto đang hoạt động và cho phép frontend gọi API

## Bắt đầu

Clone repository và cài đặt các dependency:

```bash
git clone https://github.com/Tuanlee5214/mioto-car-fe.git
cd mioto-car-fe
npm install
```

Khởi chạy máy chủ phát triển:

```bash
npm run dev
```

Vite sẽ in địa chỉ truy cập trong terminal (thường là `http://localhost:5173`).

## Cấu hình API

Địa chỉ backend hiện được khai báo trong [`src/constants/api.js`](./src/constants/api.js). Mặc định ứng dụng sử dụng:

```text
http://localhost:8081
```

Nếu backend chạy ở địa chỉ khác, hãy cập nhật `API_BASE_URL` trong file trên trước khi khởi chạy hoặc build ứng dụng. Các yêu cầu API được gửi kèm thông tin xác thực cookie; backend cần được cấu hình CORS phù hợp với địa chỉ frontend.

## Các lệnh thường dùng

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | Chạy ứng dụng ở chế độ phát triển |
| `npm run build` | Tạo bản build production trong thư mục `dist/` |
| `npm run preview` | Chạy thử bản build production |
| `npm run lint` | Kiểm tra mã nguồn bằng Oxlint |

## Các trang chính

| Đường dẫn | Mô tả |
| --- | --- |
| `/` hoặc `/home` | Trang chủ và tìm xe |
| `/login` | Đăng nhập |
| `/signup` | Đăng ký |
| `/cars/search` | Kết quả tìm kiếm xe |
| `/profile` | Thông tin cá nhân và ảnh đại diện |
| `/my-cars` | Quản lý xe đã đăng cho thuê |
| `/admin` | Khu vực quản trị |

## Cấu trúc dự án

```text
src/
├── components/    # Thành phần giao diện dùng lại
├── constants/     # Hằng số và cấu hình API
├── pages/         # Các trang của ứng dụng
├── services/      # Tích hợp API và xử lý dữ liệu
├── styles/        # CSS dùng chung
└── utils/         # Hàm tiện ích
public/            # Tài nguyên tĩnh, biểu tượng và logo hãng xe
```

## Tài nguyên hình ảnh

Logo hãng xe được lưu cục bộ trong [`public/car-brand-logos/`](./public/car-brand-logos/) để giao diện không phụ thuộc vào máy chủ ảnh bên thứ ba khi chạy. Nguồn và thông tin giấy phép của các logo được ghi trong [`public/car-brand-logos/README.md`](./public/car-brand-logos/README.md).
