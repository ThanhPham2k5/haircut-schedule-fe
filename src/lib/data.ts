"use client";

import { getSupabase } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors";
import {
  PROFILE_COLUMNS,
  assembleBookings,
  mapProfile,
  mapPublicBarber,
  mapSchedule,
  mapService,
  type BookingRow,
  type BookingServiceRow,
  type CustomerLiteRow,
  type ProfileRow,
  type PublicBarberRow,
  type ScheduleRow,
  type ServiceRow,
} from "@/lib/mappers";
import { trimTime } from "@/lib/slots";
import type {
  BarberScheduleDay,
  Booking,
  BookingStatus,
  BusyRange,
  Service,
  User,
  UserRole,
} from "@/lib/types";

// =====================================================================
// Dịch vụ
// =====================================================================
export interface ServiceInput {
  name: string;
  tagline: string;
  description: string;
  price: number;
  durationMinutes: number;
  popular: boolean;
}

export async function fetchServices(options: { activeOnly?: boolean } = {}): Promise<Service[]> {
  let query = getSupabase().from("services").select("*").order("created_at", { ascending: true });
  if (options.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ServiceRow[]).map(mapService);
}

export async function createService(input: ServiceInput): Promise<void> {
  const { error } = await getSupabase().from("services").insert({
    name: input.name,
    tagline: input.tagline || "Dịch vụ chất lượng cao",
    description: input.description || "Chăm sóc tóc chuẩn quý ông.",
    price: input.price,
    duration_minutes: input.durationMinutes,
    popular: input.popular,
  });
  if (error) throw error;
}

export async function updateService(id: string, input: ServiceInput): Promise<void> {
  const { error } = await getSupabase()
    .from("services")
    .update({
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      price: input.price,
      duration_minutes: input.durationMinutes,
      popular: input.popular,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setServiceActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await getSupabase().from("services").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await getSupabase().from("services").delete().eq("id", id);
  if (error) throw error;
}

// =====================================================================
// Thợ & người dùng
// =====================================================================

/** Danh sách thợ công khai (view public_barbers - không lộ email / SĐT). */
export async function fetchBarbers(options: { activeOnly?: boolean } = {}): Promise<User[]> {
  let query = getSupabase()
    .from("public_barbers")
    .select("id, full_name, specialty, bio, rating, review_count, is_locked")
    .order("full_name", { ascending: true });
  if (options.activeOnly) query = query.eq("is_locked", false);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as PublicBarberRow[]).map(mapPublicBarber);
}

/** Dành cho admin: toàn bộ hồ sơ theo vai trò (RLS chỉ cho admin đọc). */
export async function fetchProfilesByRole(role: UserRole): Promise<User[]> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("role", role)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(mapProfile);
}

export async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data as ProfileRow) : null;
}

export interface ProfilePatch {
  fullName: string;
  phone: string;
  specialty?: string;
  bio?: string;
}

/** Cập nhật hồ sơ (chính mình hoặc admin sửa người khác - RLS quyết định). */
export async function updateProfile(userId: string, patch: ProfilePatch): Promise<User> {
  const update: Record<string, unknown> = {
    full_name: patch.fullName,
    phone: patch.phone,
  };
  if (patch.specialty !== undefined) update.specialty = patch.specialty || null;
  if (patch.bio !== undefined) update.bio = patch.bio || null;

  const { data, error } = await getSupabase()
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return mapProfile(data as ProfileRow);
}

export async function setProfileLocked(userId: string, locked: boolean): Promise<void> {
  const { error } = await getSupabase().from("profiles").update({ is_locked: locked }).eq("id", userId);
  if (error) throw error;
}

// ----- Các thao tác cần service role: đi qua API route /api/admin/users -----
async function callAdminApi(method: "POST" | "DELETE", body: unknown): Promise<void> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AppError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

  const res = await fetch("/api/admin/users", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "Không thể thực hiện thao tác. Vui lòng thử lại.";
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      /* body không phải JSON */
    }
    throw new AppError(message);
  }
}

export interface AdminCreateUserInput {
  role: "barber" | "customer";
  fullName: string;
  email: string;
  phone: string;
  password: string;
  specialty?: string;
  bio?: string;
}

export function adminCreateUser(input: AdminCreateUserInput): Promise<void> {
  return callAdminApi("POST", input);
}

export function adminDeleteUser(userId: string): Promise<void> {
  return callAdminApi("DELETE", { userId });
}

// =====================================================================
// Lịch làm việc của thợ (barber_schedule)
// =====================================================================
export async function fetchBarberSchedule(barberId: string): Promise<BarberScheduleDay[]> {
  const { data, error } = await getSupabase()
    .from("barber_schedule")
    .select("barber_id, day_of_week, start_time, end_time, is_off")
    .eq("barber_id", barberId)
    .order("day_of_week", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ScheduleRow[]).map(mapSchedule);
}

export async function saveBarberSchedule(barberId: string, days: BarberScheduleDay[]): Promise<void> {
  const rows = days.map((d) => ({
    barber_id: barberId,
    day_of_week: d.dayOfWeek,
    start_time: d.startTime,
    end_time: d.endTime,
    is_off: d.isOff,
  }));
  const { error } = await getSupabase()
    .from("barber_schedule")
    .upsert(rows, { onConflict: "barber_id,day_of_week" });
  if (error) throw error;
}

export async function fetchBarberBusy(
  barberId: string,
  date: string,
  excludeBookingId?: string
): Promise<BusyRange[]> {
  const { data, error } = await getSupabase().rpc("get_barber_busy", {
    p_barber_id: barberId,
    p_date: date,
    p_exclude_booking_id: excludeBookingId ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as { start_time: string; end_time: string }[]).map((r) => ({
    start: trimTime(r.start_time),
    end: trimTime(r.end_time),
  }));
}

// =====================================================================
// Lịch hẹn
// =====================================================================

/** Trả về các lịch hẹn mà người dùng hiện tại được phép xem (RLS lọc theo vai trò). */
export async function fetchBookings(): Promise<Booking[]> {
  const supabase = getSupabase();
  const [bookingsRes, itemsRes, servicesRes, customersRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, customer_id, barber_id, booking_date, start_time, end_time, total_price, status, notes, created_at")
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false }),
    supabase.from("booking_services").select("booking_id, service_id, price_at_booking"),
    supabase.from("services").select("*"),
    supabase.from("profiles").select("id, full_name, email, phone").eq("role", "customer"),
  ]);
  if (bookingsRes.error) throw bookingsRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (customersRes.error) throw customersRes.error;

  return assembleBookings(
    (bookingsRes.data ?? []) as BookingRow[],
    (itemsRes.data ?? []) as BookingServiceRow[],
    ((servicesRes.data ?? []) as ServiceRow[]).map(mapService),
    (customersRes.data ?? []) as CustomerLiteRow[]
  );
}

export interface CreateBookingInput {
  barberId: string;
  date: string;
  time: string;
  serviceIds: string[];
  notes?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<string> {
  const { data, error } = await getSupabase().rpc("create_booking", {
    p_barber_id: input.barberId,
    p_date: input.date,
    p_start_time: input.time,
    p_service_ids: input.serviceIds,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function setBookingStatus(bookingId: string, status: BookingStatus): Promise<void> {
  const { error } = await getSupabase().rpc("set_booking_status", {
    p_booking_id: bookingId,
    p_status: status,
  });
  if (error) throw error;
}

export interface AdminUpdateBookingInput {
  bookingId: string;
  barberId: string;
  date: string;
  time: string;
  serviceIds: string[];
  status: BookingStatus;
  notes?: string;
}

export async function adminUpdateBooking(input: AdminUpdateBookingInput): Promise<void> {
  const { error } = await getSupabase().rpc("admin_update_booking", {
    p_booking_id: input.bookingId,
    p_barber_id: input.barberId,
    p_date: input.date,
    p_start_time: input.time,
    p_service_ids: input.serviceIds,
    p_status: input.status,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
}

export async function deleteBooking(bookingId: string): Promise<void> {
  const { error } = await getSupabase().from("bookings").delete().eq("id", bookingId);
  if (error) throw error;
}
