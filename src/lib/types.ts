export type Role = "admin" | "barber" | "customer";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface BarberSchedule {
  id: string;
  barber_id: string;
  day_of_week: number; // 0 (Sunday) - 6 (Sartuday)
  start_time: string; // "HH:mm" format
  end_time: string; // "HH:mm" format
  is_off: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  customer_id: string;
  barber_id: string;
  service_ids: string[];
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: BookingStatus;
  created_at: string;
}
