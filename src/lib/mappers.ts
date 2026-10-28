import type {
  Booking,
  BookingServiceItem,
  BookingStatus,
  BarberScheduleDay,
  Service,
  ServiceCategory,
  User,
  UserRole,
} from "./types";
import { timeToMinutes, trimTime } from "./slots";

// ----- Kiểu dòng thô trả về từ Supabase (snake_case) -----
export interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  specialty: string | null;
  bio: string | null;
  rating: number | null;
  review_count: number | null;
  is_locked: boolean | null;
  email_verified: boolean | null;
  created_at: string | null;
}

export interface PublicBarberRow {
  id: string;
  full_name: string | null;
  specialty: string | null;
  bio: string | null;
  rating: number | null;
  review_count: number | null;
  is_locked: boolean | null;
}

export interface ServiceRow {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: ServiceCategory | null;
  icon_name: string | null;
  popular: boolean | null;
  is_active: boolean | null;
}

export interface BookingRow {
  id: string;
  customer_id: string;
  barber_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
}

export interface BookingServiceRow {
  booking_id: string;
  service_id: string;
  price_at_booking: number;
}

export interface CustomerLiteRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface ScheduleRow {
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_off: boolean;
}

export const PROFILE_COLUMNS =
  "id, full_name, email, phone, role, specialty, bio, rating, review_count, is_locked, email_verified, created_at";

export function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.full_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    role: row.role,
    specialty: row.specialty ?? undefined,
    bio: row.bio ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count ?? undefined,
    isEmailVerified: row.email_verified ?? false,
    isLocked: row.is_locked ?? false,
    createdAt: row.created_at ?? undefined,
  };
}

export function mapPublicBarber(row: PublicBarberRow): User {
  return {
    id: row.id,
    name: row.full_name ?? "",
    email: "",
    phone: "",
    role: "barber",
    specialty: row.specialty ?? undefined,
    bio: row.bio ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count ?? undefined,
    isLocked: row.is_locked ?? false,
  };
}

export function mapService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    price: row.price,
    durationMinutes: row.duration_minutes,
    category: row.category ?? "haircut",
    iconName: row.icon_name ?? "Scissors",
    popular: row.popular ?? false,
    isActive: row.is_active ?? true,
  };
}

export function mapSchedule(row: ScheduleRow): BarberScheduleDay {
  return {
    barberId: row.barber_id,
    dayOfWeek: row.day_of_week,
    startTime: trimTime(row.start_time),
    endTime: trimTime(row.end_time),
    isOff: row.is_off,
  };
}

/** Ghép booking + booking_services + hồ sơ khách (join phía client). */
export function assembleBookings(
  bookings: BookingRow[],
  items: BookingServiceRow[],
  services: Service[],
  customers: CustomerLiteRow[]
): Booking[] {
  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const itemsByBooking = new Map<string, BookingServiceItem[]>();
  for (const it of items) {
    const list = itemsByBooking.get(it.booking_id) ?? [];
    list.push({
      serviceId: it.service_id,
      name: serviceName.get(it.service_id) ?? "Dịch vụ tóc",
      priceAtBooking: it.price_at_booking,
    });
    itemsByBooking.set(it.booking_id, list);
  }

  return bookings.map((b) => {
    const list = itemsByBooking.get(b.id) ?? [];
    const customer = customerById.get(b.customer_id);
    const start = trimTime(b.start_time);
    const end = trimTime(b.end_time);
    return {
      id: b.id,
      customerId: b.customer_id,
      customerName: customer?.full_name || "Khách hàng",
      customerEmail: customer?.email ?? "",
      customerPhone: customer?.phone ?? "",
      barberId: b.barber_id,
      services: list,
      serviceId: list[0]?.serviceId ?? "",
      serviceName: list.length > 0 ? list.map((s) => s.name).join(" + ") : "Dịch vụ tóc",
      date: b.booking_date,
      time: start,
      endTime: end,
      durationMinutes: timeToMinutes(end) - timeToMinutes(start),
      price: b.total_price,
      status: b.status,
      notes: b.notes ?? undefined,
      createdAt: b.created_at,
    };
  });
}
