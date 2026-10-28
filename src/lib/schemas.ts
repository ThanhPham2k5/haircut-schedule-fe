import { z } from "zod";

/** Bỏ khoảng trắng / dấu chấm / gạch ngang trong số điện thoại. */
export function normalizePhone(value: string): string {
  return value.replace(/[\s.\-()]/g, "");
}

const PHONE_REGEX = /^(0|\+84)\d{9}$/;

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập số điện thoại")
  .refine((v) => PHONE_REGEX.test(normalizePhone(v)), {
    message: "Số điện thoại không hợp lệ (ví dụ: 0988 777 666)",
  })
  .transform(normalizePhone);

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email")
  .email("Email không hợp lệ")
  .transform((v) => v.toLowerCase());

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Họ tên phải có ít nhất 2 ký tự")
  .max(80, "Họ tên tối đa 80 ký tự");

export const passwordSchema = z
  .string()
  .min(6, "Mật khẩu phải có tối thiểu 6 ký tự")
  .max(72, "Mật khẩu tối đa 72 ký tự");

// ---------------- Auth ----------------
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const registerSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

export const otpSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "Mã xác thực gồm 6 chữ số"),
});

// ---------------- Hồ sơ ----------------
export const profileSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  specialty: z.string().trim().max(120, "Chuyên môn tối đa 120 ký tự").optional(),
  bio: z.string().trim().max(500, "Giới thiệu tối đa 500 ký tự").optional(),
});

export const changePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

// ---------------- Admin: tài khoản ----------------
export const adminCreateUserSchema = z.object({
  role: z.enum(["barber", "customer"]),
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  specialty: z.string().trim().max(120, "Chuyên môn tối đa 120 ký tự").optional(),
  bio: z.string().trim().max(500, "Giới thiệu tối đa 500 ký tự").optional(),
});

export const adminEditUserSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  specialty: z.string().trim().max(120, "Chuyên môn tối đa 120 ký tự").optional(),
  bio: z.string().trim().max(500, "Giới thiệu tối đa 500 ký tự").optional(),
});

// ---------------- Admin: dịch vụ ----------------
export const serviceFormSchema = z.object({
  name: z.string().trim().min(2, "Tên dịch vụ tối thiểu 2 ký tự").max(100),
  tagline: z.string().trim().max(120, "Mô tả ngắn tối đa 120 ký tự"),
  description: z.string().trim().max(500, "Chi tiết tối đa 500 ký tự"),
  price: z.coerce
    .number({ error: "Giá phải là số" })
    .int("Giá phải là số nguyên")
    .min(0, "Giá không được âm")
    .max(100_000_000, "Giá quá lớn"),
  durationMinutes: z.coerce
    .number({ error: "Thời lượng phải là số" })
    .int("Thời lượng phải là số nguyên")
    .min(5, "Thời lượng tối thiểu 5 phút")
    .max(480, "Thời lượng tối đa 480 phút"),
  popular: z.boolean(),
});

// ---------------- Đặt lịch ----------------
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ");
const timeString = z.string().regex(/^\d{2}:\d{2}$/, "Giờ không hợp lệ");

export const bookingRequestSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1, "Vui lòng chọn dịch vụ"),
  barberId: z.string().min(1, "Vui lòng chọn thợ cắt tóc"),
  date: dateString,
  time: timeString.min(1, "Vui lòng chọn khung giờ"),
  notes: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

export const adminBookingEditSchema = z.object({
  serviceId: z.string().min(1, "Vui lòng chọn dịch vụ"),
  barberId: z.string().min(1, "Vui lòng chọn thợ"),
  date: dateString,
  time: timeString.min(1, "Vui lòng chọn khung giờ"),
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
  notes: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

// ---------------- Lịch làm việc thợ ----------------
export const scheduleDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    isOff: z.boolean(),
  })
  .refine((v) => v.isOff || v.startTime < v.endTime, {
    message: "Giờ kết thúc phải sau giờ bắt đầu",
    path: ["endTime"],
  });

export const scheduleSchema = z.array(scheduleDaySchema).length(7);
