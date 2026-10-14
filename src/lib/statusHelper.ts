import { BookingStatus } from "./types";

export const getStatusBadgeInfo = (status: BookingStatus) => {
  switch (status) {
    case "pending":
      return {
        label: "Chờ xác nhận",
        variant: "outline" as const,
        className: "border-yellow-500 text-yellow-600 bg-yellow-50",
      };

    case "confirmed":
      return {
        label: "Đã xác nhận",
        variant: "default" as const,
        className: "bg-blue-600 hover:bg-blue-700 text-white",
      };

    case "completed":
      return {
        label: "Hoàn thành",
        variant: "secondary" as const,
        className: "bg-green-100 text-green-700 hover:bg-green-100",
      };

    case "cancelled":
      return {
        label: "Đã huỷ",
        variant: "destructive" as const,
        className: "bg-red-100 text-red-700 hover:bg-red-100",
      };

    default:
      return {
        label: status,
        variant: "outline" as const,
        className: "",
      };
  }
};
