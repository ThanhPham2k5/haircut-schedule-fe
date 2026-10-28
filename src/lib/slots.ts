import type {
  BarberScheduleDay,
  BusyRange,
  SlotUnavailableReason,
  TimeSlotStatus,
} from "./types";

/** Các mốc giờ bắt đầu cắt trong ngày (cách nhau 1 giờ, nghỉ trưa 12:30). */
export const ALL_TIME_SLOTS = [
  "08:30",
  "09:30",
  "10:30",
  "11:30",
  "13:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
  "18:30",
  "19:30",
];

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:30:00" (kiểu time của Postgres) -> "09:30" */
export function trimTime(value: string): string {
  return value.slice(0, 5);
}

export const FULL_DAY_WINDOW = { startTime: "00:00", endTime: "23:59" };

export interface ComputeSlotsInput {
  date: string; // yyyy-MM-dd
  durationMinutes: number;
  /** Lịch làm việc của thợ đúng ngày đó; null/undefined = thợ không có ca */
  schedule: Pick<BarberScheduleDay, "startTime" | "endTime" | "isOff"> | null | undefined;
  busy: BusyRange[];
  now?: Date;
  /** Danh sách mốc giờ ứng viên (mặc định ALL_TIME_SLOTS) */
  candidates?: string[];
}

/**
 * Một mốc giờ khả dụng khi:
 *  - thợ có ca ngày đó và [giờ bắt đầu, giờ bắt đầu + thời lượng) nằm trọn trong ca,
 *  - không chồng lên khoảng nào đang bận,
 *  - chưa qua (với ngày hôm nay).
 * Quy tắc này khớp với hàm create_booking + ràng buộc bookings_no_overlap trong DB.
 */
export function computeSlots(input: ComputeSlotsInput): TimeSlotStatus[] {
  const { date, durationMinutes, schedule, busy } = input;
  const candidates = input.candidates ?? ALL_TIME_SLOTS;
  const now = input.now ?? new Date();

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return candidates.map((time) => {
    const start = timeToMinutes(time);
    const end = start + durationMinutes;

    const fail = (reason: SlotUnavailableReason): TimeSlotStatus => ({
      time,
      available: false,
      reason,
    });

    if (date < todayKey || (date === todayKey && start <= nowMinutes)) {
      return fail("past");
    }
    if (!schedule || schedule.isOff) return fail("off");
    if (start < timeToMinutes(schedule.startTime) || end > timeToMinutes(schedule.endTime)) {
      return fail("outside");
    }
    const overlaps = busy.some(
      (b) => start < timeToMinutes(b.end) && end > timeToMinutes(b.start)
    );
    if (overlaps) return fail("booked");

    return { time, available: true };
  });
}

/** Nhãn ngắn hiển thị dưới mỗi ô giờ. */
export function slotReasonLabel(reason?: SlotUnavailableReason): string {
  switch (reason) {
    case "past":
      return "Đã qua";
    case "off":
      return "Thợ nghỉ";
    case "outside":
      return "Ngoài ca";
    default:
      return "Đã kín";
  }
}
