import { format, parseISO } from "date-fns";

// Helper định dạng tiền Việt Nam
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// Helper định dạng ngày Việt Nam (dd/MM/yyyy)
export function formatDateVN(dateInput: string | Date): string {
  if (!dateInput) return "";
  try {
    if (typeof dateInput === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const parts = dateInput.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return format(parseISO(dateInput), "dd/MM/yyyy");
    }
    return format(dateInput, "dd/MM/yyyy");
  } catch {
    return String(dateInput);
  }
}

/** Mã lịch hẹn ngắn gọn để hiển thị (UUID đầy đủ quá dài). */
export function shortBookingCode(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export const WEEKDAYS_VN = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

export function getWeekdayVN(date: Date): string {
  return WEEKDAYS_VN[date.getDay()];
}

/** yyyy-MM-dd theo giờ địa phương của trình duyệt. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
