import { User, Service, BarberSchedule, Booking } from "./types";

export const MOCK_USERS = [
  {
    id: "u1",
    full_name: "Quản trị viên",
    email: "admin@salon.com",
    password: "123", // test password
    phone: "0901234567",
    role: "admin" as const,
    created_at: "2023-01-01",
  },
  {
    id: "u2",
    full_name: "Trần Văn Thợ",
    email: "tho1@salon.com",
    password: "123",
    phone: "0907654321",
    role: "barber" as const,
    created_at: "2023-02-01",
  },
  {
    id: "u3",
    full_name: "Khách Hàng VIP",
    email: "khach@gmail.com",
    password: "123",
    phone: "0912345678",
    role: "customer" as const,
    created_at: "2023-03-01",
  },
];

export const MOCK_SERVICES: Service[] = [
  {
    id: "s1",
    name: "Cắt tóc nam tiêu chuẩn",
    description: "Cắt, gội, sấy tạo kiểu",
    price: 100000,
    duration_minutes: 30,
    is_active: true,
  },
  {
    id: "s2",
    name: "Uốn tóc Hàn Quốc",
    description: "Uốn phồng, uốn rủ",
    price: 300000,
    duration_minutes: 90,
    is_active: true,
  },
  {
    id: "s3",
    name: "Nhuộm màu thời trang",
    description: "Nhuộm các màu trend",
    price: 400000,
    duration_minutes: 120,
    is_active: true,
  },
];

export const MOCK_SCHEDULES: BarberSchedule[] = [
  {
    id: "sch1",
    barber_id: "u2",
    day_of_week: 1,
    start_time: "08:00",
    end_time: "20:00",
    is_off: false,
  }, // Monday
  {
    id: "sch2",
    barber_id: "u2",
    day_of_week: 2,
    start_time: "08:00",
    end_time: "20:00",
    is_off: false,
  }, // Tuesday
];

export const initMockData = () => {
  // window exists only on client side
  if (typeof window === "undefined") return;

  if (!localStorage.getItem("services")) {
    localStorage.setItem("services", JSON.stringify(MOCK_SERVICES));
  }
  if (!localStorage.getItem("schedules")) {
    localStorage.setItem("schedules", JSON.stringify(MOCK_SCHEDULES));
  }
  if (!localStorage.getItem("bookings")) {
    localStorage.setItem("bookings", JSON.stringify([]));
  }
};

export const getBookings = (): Booking[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("bookings");
  return data ? JSON.parse(data) : [];
};

export const saveBookings = (bookings: Booking[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("bookings", JSON.stringify(bookings));
  }
};
