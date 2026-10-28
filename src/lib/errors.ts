import { toast } from "sonner";

/** Lỗi nghiệp vụ phía FE với thông điệp tiếng Việt sẵn sàng hiển thị. */
export class AppError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

/** Mã lỗi do RPC trong supabase/schema.sql ném ra (raise exception '...'). */
const RPC_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  SERVICE_REQUIRED: "Vui lòng chọn ít nhất một dịch vụ.",
  SERVICE_UNAVAILABLE: "Dịch vụ đã chọn không còn khả dụng.",
  BARBER_UNAVAILABLE: "Thợ này hiện không nhận lịch.",
  BARBER_OFF: "Thợ nghỉ vào ngày này. Vui lòng chọn ngày khác.",
  OUTSIDE_SCHEDULE: "Khung giờ nằm ngoài ca làm việc của thợ.",
  PAST_SLOT: "Khung giờ này đã qua. Vui lòng chọn giờ khác.",
  SLOT_TAKEN: "Khung giờ vừa có người đặt trước. Vui lòng chọn khung giờ khác.",
  INVALID_STATUS: "Trạng thái lịch hẹn không hợp lệ.",
  INVALID_TRANSITION: "Không thể chuyển lịch hẹn sang trạng thái này.",
  BOOKING_NOT_FOUND: "Không tìm thấy lịch hẹn.",
};

/** Mã lỗi của Supabase Auth (GoTrue). */
const AUTH_CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  email_not_confirmed:
    "Email chưa được xác thực. Vui lòng kiểm tra hộp thư và nhập mã xác thực.",
  user_already_exists: "Email này đã được đăng ký. Vui lòng chuyển sang Đăng Nhập.",
  email_exists: "Email này đã được đăng ký. Vui lòng chuyển sang Đăng Nhập.",
  weak_password: "Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.",
  over_email_send_rate_limit:
    "Gửi email quá nhanh. Vui lòng đợi một lúc rồi thử lại.",
  over_request_rate_limit: "Thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
  otp_expired: "Mã xác thực đã hết hạn. Vui lòng bấm gửi lại mã.",
  same_password: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  session_not_found: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  user_banned: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản lý salon.",
};

/** SQLSTATE do Postgres / PostgREST trả về. */
const DB_CODE_MESSAGES: Record<string, string> = {
  "23505": "Dữ liệu bị trùng với bản ghi đã có.",
  "23P01": "Khung giờ vừa có người đặt trước. Vui lòng chọn khung giờ khác.",
  "23503":
    "Dữ liệu đang được sử dụng ở nơi khác nên không thể xóa. Hãy tạm ngưng / khóa thay vì xóa.",
  "23514": "Dữ liệu không hợp lệ.",
  "42501": "Bạn không có quyền thực hiện thao tác này.",
  PGRST301: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  PGRST116: "Không tìm thấy dữ liệu.",
};

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  details?: unknown;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Đã có lỗi xảy ra. Vui lòng thử lại."
): string {
  if (error instanceof AppError) return error.message;
  if (typeof error === "string") return RPC_MESSAGES[error] ?? error;
  if (!error || typeof error !== "object") return fallback;

  const e = error as ErrorLike;
  const message = typeof e.message === "string" ? e.message : "";
  const code = typeof e.code === "string" ? e.code : "";

  if (message && RPC_MESSAGES[message]) return RPC_MESSAGES[message];
  if (code && AUTH_CODE_MESSAGES[code]) return AUTH_CODE_MESSAGES[code];
  if (code && DB_CODE_MESSAGES[code]) return DB_CODE_MESSAGES[code];

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  }
  if (/invalid login credentials/i.test(message)) {
    return AUTH_CODE_MESSAGES.invalid_credentials;
  }
  if (/email not confirmed/i.test(message)) {
    return AUTH_CODE_MESSAGES.email_not_confirmed;
  }
  if (/user already registered/i.test(message)) {
    return AUTH_CODE_MESSAGES.user_already_exists;
  }
  if (/token has expired|otp.*expired|invalid.*(token|otp)/i.test(message)) {
    return "Mã xác thực không đúng hoặc đã hết hạn.";
  }
  if (/rate limit/i.test(message)) {
    return AUTH_CODE_MESSAGES.over_email_send_rate_limit;
  }
  return fallback;
}

/** Ghi log + hiện toast lỗi. Trả về thông điệp đã hiển thị. */
export function reportError(error: unknown, fallback?: string): string {
  const message = getErrorMessage(error, fallback);
  console.error("[app-error]", error);
  toast.error(message);
  return message;
}
