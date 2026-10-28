export type UserRole = "admin" | "barber" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  specialty?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
  isEmailVerified?: boolean;
  isLocked: boolean; // Khóa tài khoản
  createdAt?: string;
}

export type ServiceCategory = "haircut" | "beard" | "combo" | "treatment";

export interface Service {
  id: string;
  name: string;
  tagline: string;
  description: string;
  durationMinutes: number;
  price: number; // VNĐ
  popular: boolean;
  category: ServiceCategory;
  iconName: string;
  isActive: boolean; // false = tạm ngưng
}

export type BookingStatus =
  | "pending" // Chờ xác nhận
  | "confirmed" // Đã xác nhận
  | "in_progress" // Đang phục vụ
  | "completed" // Đã hoàn thành
  | "cancelled"; // Đã hủy

export interface BookingServiceItem {
  serviceId: string;
  name: string;
  priceAtBooking: number;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  barberId: string;
  services: BookingServiceItem[];
  /** Dịch vụ chính (đầu tiên) - tiện cho hiển thị / thống kê */
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  price: number; // total_price
  status: BookingStatus;
  notes?: string;
  createdAt: string;
}

/** Một dòng trong bảng barber_schedule */
export interface BarberScheduleDay {
  barberId: string;
  dayOfWeek: number; // 0 = Chủ nhật ... 6 = Thứ bảy
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isOff: boolean;
}

export interface BusyRange {
  start: string; // HH:mm
  end: string; // HH:mm
}

export type SlotUnavailableReason = "booked" | "off" | "past" | "outside";

export interface TimeSlotStatus {
  time: string;
  available: boolean;
  reason?: SlotUnavailableReason;
}
