import { BookingStatus } from "./types";

export function getStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "in_progress":
      return "Đang phục vụ";
    case "completed":
      return "Đã hoàn thành";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

export function getStatusBadgeVariant(
  status: BookingStatus
): "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" {
  return status;
}
