# Vanguard Barber – Hệ thống đặt lịch cắt tóc (Next.js + Supabase)

Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Auth + Postgres + RLS) · zod · sonner (toast) · next-themes (sáng/tối).

## Chạy dự án

1. **Tạo project Supabase** tại https://supabase.com.
2. Vào **SQL Editor** → dán toàn bộ `supabase/schema.sql` → Run (chạy lại nhiều lần vẫn an toàn).
3. Sao chép `.env.example` thành `.env.local` và điền 3 giá trị (Project Settings → API):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # chỉ dùng phía server, KHÔNG commit, KHÔNG thêm NEXT_PUBLIC_
   ```
4. Cài và chạy:
   ```bash
   npm install
   npm run seed     # tạo tài khoản demo + bảng giá dịch vụ
   npm run dev      # http://localhost:3000
   ```

### Tài khoản demo (mật khẩu `123456`)

| Vai trò | Email                                                                   | Đăng nhập tại    |
| ------- | ----------------------------------------------------------------------- | ---------------- |
| Admin   | `admin@vanguard.vn`                                                     | `/auth/admin`    |
| Thợ     | `long.le@vanguard.vn`, `minh.tran@vanguard.vn`, `khoa.pham@vanguard.vn` | `/auth/barber`   |
| Khách   | `khach@vanguard.vn`                                                     | `/auth/customer` |

## Xác thực email (OTP)

Khách tự đăng ký tại `/auth/customer` và nhập mã OTP gửi qua email.

- Supabase → Authentication → Sign In / Providers → Email: bật **Confirm email**.
- Supabase → Authentication → Email Templates → **Confirm signup**: dùng `{{ .Token }}` trong nội dung để email chứa mã số, ví dụ: `Mã xác thực của bạn: {{ .Token }}`.
- Nếu tắt "Confirm email", đăng ký xong đăng nhập luôn, không cần OTP.
- Email mặc định của Supabase bị giới hạn số thư/giờ; dùng SMTP riêng cho production.

## Các trang

| Đường dẫn                     | Ai dùng              | Mô tả                                              |
| ----------------------------- | -------------------- | -------------------------------------------------- |
| `/`                           | Mọi người            | Trang chủ, bảng giá, đội thợ (chỉ xem)             |
| `/auth/customer`              | Khách                | Đăng nhập / đăng ký / OTP                          |
| `/auth/barber`, `/auth/admin` | Thợ, Admin           | Đăng nhập theo vai trò (tài khoản do admin cấp)    |
| `/customer/booking`           | Khách (đã đăng nhập) | Đặt lịch: chọn dịch vụ → thợ → ngày/giờ → xác nhận |
| `/customer/appointments`      | Khách                | Xem và hủy lịch của chính mình                     |
| `/barber/schedule`            | Thợ                  | Ca làm trong ngày: nhận ca, bắt đầu, hoàn thành    |
| `/admin/dashboard`            | Admin                | Doanh thu, lịch hẹn, thợ, dịch vụ, khách hàng      |
| `/profile`                    | Mọi vai trò          | Sửa hồ sơ, đổi mật khẩu                            |

## Thay đổi so với bản gốc

- **Dữ liệu**: localStorage → Supabase. Toàn bộ truy cập dữ liệu nằm trong `src/lib/data.ts`.
- **Guest**: đã xóa đặt lịch và tra cứu lịch của khách vãng lai. Phải đăng nhập tài khoản khách mới đặt/xem lịch. Nút "Khách vãng lai tại quầy" của admin cũng bị bỏ vì lịch hẹn nay luôn gắn với một tài khoản khách.
- **Zod**: schema trong `src/lib/schemas.ts`, helper `src/lib/validation.ts`; lỗi hiện ngay dưới ô nhập và qua toast.
- **Toast lỗi**: `reportError` (`src/lib/errors.ts`) chuyển lỗi Supabase/RPC thành tiếng Việt dễ hiểu.
- **Dark/Light**: `next-themes`, nút đổi giao diện trên thanh điều hướng (Sáng / Tối / Theo hệ thống).

## Cơ sở dữ liệu (theo ERD)

| ERD                | Bảng thực tế                | Ghi chú                                                                   |
| ------------------ | --------------------------- | ------------------------------------------------------------------------- |
| `user`             | `profiles` (+ `auth.users`) | Mật khẩu băm do Supabase Auth giữ, không lưu trong `profiles`             |
| `barber_schedule`  | `barber_schedule`           | `day_of_week` 0 = Chủ nhật; mỗi thợ mới tự có 7 dòng mặc định 08:30–20:30 |
| `bookings`         | `bookings`                  | Ràng buộc exclusion chống trùng giờ cùng thợ                              |
| `booking_services` | `booking_services`          | Lưu `price_at_booking`                                                    |
| `services`         | `services`                  | Dùng `is_active` để tạm ngưng                                             |

Phần mở rộng so với ERD: `profiles.is_locked`, `email_verified`, `specialty`, `bio`, `rating`, `review_count`; `services.tagline`, `category`, `icon_name`, `popular`; trạng thái `in_progress`; view `public_barbers`.

Quy tắc quan trọng được thực thi **ở DB** (RLS + hàm RPC `create_booking`, `set_booking_status`, `admin_update_booking`): giá và giờ kết thúc tính phía server, chỉ đặt trong ca làm, không đặt giờ đã qua, không trùng lịch, thợ chỉ đổi trạng thái lịch của mình, khách chỉ hủy lịch của mình. Khi đăng ký công khai, `role` luôn là `customer`; vai trò thợ/admin chỉ gán qua `app_metadata` (seed hoặc API admin).

## Bảo mật

- `SUPABASE_SERVICE_ROLE_KEY` bỏ qua RLS: chỉ nằm trong `.env.local` / biến môi trường server, được dùng ở `src/app/api/admin/users/route.ts` (tạo/xóa tài khoản, luôn kiểm tra token là admin) và `scripts/seed.mjs`.
- Đổi mật khẩu demo `123456` trước khi triển khai thật.

## Lệnh

```bash
npm run dev        # chạy dev
npm run build      # build production
npm run typecheck  # kiểm tra TypeScript
npm run lint
npm run seed       # dữ liệu demo
```
