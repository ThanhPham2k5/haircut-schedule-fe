// Thêm dữ liệu demo để mỗi bảng có khoảng 40 dòng: services, profiles (khách + thợ), bookings, booking_services.
// Chạy SAU `npm run seed`:  node scripts/seed-bulk.mjs
// Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local (dùng: node --env-file=.env.local scripts/seed-bulk.mjs)
// An toàn khi chạy lại: mỗi bảng chỉ thêm cho đủ số mục tiêu.
//
// Thứ tự thêm để đúng khóa ngoại:
//   services → auth.users (trigger tự tạo profiles, và barber_schedule cho thợ)
//   → bookings (customer_id, barber_id trỏ tới profiles) → booking_services (trỏ tới bookings và services)
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGET = 40; // số dòng mục tiêu cho mỗi bảng
const PASSWORD = "123456";
const TZ = "Asia/Ho_Chi_Minh";
const SCHEDULE_START = 8 * 60 + 30; // 08:30 (mặc định của barber_schedule)
const SCHEDULE_END = 20 * 60 + 30; // 20:30
const SLOT_STEP = 30;

// ---------- Tiện ích ----------
// Bộ sinh số ngẫu nhiên có seed: chạy lại cho kết quả giống nhau
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(20261030);
const pick = (arr) => arr[Math.floor(random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function todayVN() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function nowMinutesVN() {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .split(":")
    .map(Number);
  return h * 60 + m;
}
function addDays(dateKey, n) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const toHHMMSS = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------- 1. Dịch vụ (services) ----------
const STYLES = [
  { name: "Cắt Tóc Undercut", category: "haircut", base: 100000, duration: 45 },
  { name: "Cắt Tóc Side Part", category: "haircut", base: 110000, duration: 45 },
  { name: "Cắt Tóc Two Block", category: "haircut", base: 120000, duration: 50 },
  { name: "Cắt Tóc Crew Cut", category: "haircut", base: 90000, duration: 30 },
  { name: "Tỉa Râu Gọn", category: "beard", base: 60000, duration: 20 },
  { name: "Cạo Râu Dao Lam", category: "beard", base: 80000, duration: 30 },
  { name: "Combo Cắt Và Gội", category: "combo", base: 150000, duration: 60 },
  { name: "Combo VIP Cắt Râu", category: "combo", base: 200000, duration: 90 },
  { name: "Nhuộm Tóc Nam", category: "treatment", base: 300000, duration: 75 },
  { name: "Ủ Tóc Phục Hồi", category: "treatment", base: 180000, duration: 45 },
];
const TIERS = [
  { suffix: "Tiêu chuẩn", priceMul: 1, durationDelta: 0 },
  { suffix: "Cao cấp", priceMul: 1.25, durationDelta: 15 },
  { suffix: "VIP", priceMul: 1.6, durationDelta: 30 },
  { suffix: "Tiết kiệm", priceMul: 0.8, durationDelta: -10 },
];
const ICONS = ["Scissors", "Sparkles", "Crown", "Wind", "Droplets"];

function buildServiceCatalog() {
  const items = [];
  for (const tier of TIERS) {
    for (const style of STYLES) {
      items.push({
        name: `${style.name} – ${tier.suffix}`,
        tagline: `Gói ${tier.suffix.toLowerCase()}`,
        description: `${style.name}, phục vụ theo gói ${tier.suffix.toLowerCase()}.`,
        price: Math.round((style.base * tier.priceMul) / 1000) * 1000,
        duration_minutes: Math.max(15, style.duration + tier.durationDelta),
        popular: tier.suffix === "VIP",
        category: style.category,
        icon_name: ICONS[items.length % ICONS.length],
      });
    }
  }
  return items; // 40 mẫu, đủ để lấp đầy bảng
}

async function seedServices() {
  const { data: existing, error } = await supabase.from("services").select("name");
  if (error) throw error;
  const names = new Set(existing.map((s) => s.name));
  const missing = Math.max(0, TARGET - existing.length);
  const toAdd = buildServiceCatalog()
    .filter((s) => !names.has(s.name))
    .slice(0, missing);
  if (toAdd.length === 0) {
    console.log(`= services đã có ${existing.length} dòng, bỏ qua`);
    return;
  }
  const { error: insertError } = await supabase.from("services").insert(toAdd);
  if (insertError) throw insertError;
  console.log(`+ services: thêm ${toAdd.length} dịch vụ (tổng ${existing.length + toAdd.length})`);
}

// ---------- 2. Tài khoản (profiles) ----------
const LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];
const MID = ["Văn", "Thị", "Minh", "Quốc", "Thanh", "Gia", "Ngọc", "Đức", "Hữu", "Anh"];
const FIRST = ["An", "Bình", "Cường", "Dũng", "Hải", "Hùng", "Khoa", "Long", "Nam", "Phúc", "Quân", "Sơn", "Tuấn", "Việt", "Yên", "Linh", "Trang", "Hà", "Mai", "Lan"];
const fullNameOf = (i) => `${LAST[i % LAST.length]} ${MID[(i * 7 + 3) % MID.length]} ${FIRST[(i * 5 + 1) % FIRST.length]}`;
const phoneOf = (i) => `09${String(10000000 + i * 7919).slice(0, 8)}`;

const EXTRA_BARBERS = [
  { email: "tho04@vanguard.vn", fullName: "Đỗ Thành Đạt", specialty: "Fade & Undercut hiện đại", bio: "Chuyên các kiểu fade sắc nét và undercut." },
  { email: "tho05@vanguard.vn", fullName: "Võ Hoài Nam", specialty: "Tạo kiểu tóc Side Part", bio: "Nhẹ nhàng, tư vấn kiểu tóc theo khuôn mặt." },
  { email: "tho06@vanguard.vn", fullName: "Bùi Gia Huy", specialty: "Râu & Combo quý ông", bio: "Tỉ mỉ với râu và combo cắt + cạo." },
  { email: "tho07@vanguard.vn", fullName: "Huỳnh Minh Tâm", specialty: "Nhuộm & Ủ tóc phục hồi", bio: "Kinh nghiệm nhuộm và chăm sóc tóc nam." },
];

async function listAllUsers() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return new Map(data.users.map((u) => [u.email?.toLowerCase(), u]));
}

/** Đảm bảo vai trò đúng ở cả app_metadata lẫn profiles.
 *  Tài khoản đã tồn tại từ lần seed trước (hoặc tạo tay) có thể đang là customer nên phải cập nhật lại.
 *  Cập nhật profiles.role sẽ kích hoạt trigger tạo barber_schedule cho thợ. */
async function syncRole(userId, role) {
  const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  if (metaError) throw new Error(`app_metadata ${userId}: ${metaError.message}`);
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(`profiles.role ${userId}: ${error.message}`);
}

async function ensureUser(existing, acc) {
  const found = existing.get(acc.email.toLowerCase());
  if (found) {
    await syncRole(found.id, acc.role);
    return found.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: acc.email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role: acc.role },
    user_metadata: { full_name: acc.fullName, phone: acc.phone },
  });
  if (error) throw new Error(`${acc.email}: ${error.message}`);
  existing.set(acc.email.toLowerCase(), data.user);
  await syncRole(data.user.id, acc.role);
  return data.user.id;
}

async function seedAccounts() {
  const existing = await listAllUsers();

  // Thợ: thêm cho đủ (tổng khoảng 40 hồ sơ cùng khách)
  for (const b of EXTRA_BARBERS) {
    const id = await ensureUser(existing, { ...b, role: "barber", phone: phoneOf(existing.size + 1) });
    const { error } = await supabase
      .from("profiles")
      .update({
        specialty: b.specialty,
        bio: b.bio,
        rating: Math.round((4.5 + random() * 0.5) * 10) / 10,
        review_count: 20 + Math.floor(random() * 130),
      })
      .eq("id", id);
    if (error) throw new Error(`profile ${b.email}: ${error.message}`);
  }

  // Khách: khach01 … khach39 (khach@vanguard.vn đã có từ seed cũ)
  let created = 0;
  for (let i = 1; i <= TARGET - 1; i++) {
    const email = `khach${String(i).padStart(2, "0")}@vanguard.vn`;
    if (existing.has(email)) continue;
    await ensureUser(existing, {
      email,
      role: "customer",
      fullName: fullNameOf(i),
      phone: phoneOf(i + 100),
    });
    created++;
  }
  console.log(`+ profiles: thêm ${EXTRA_BARBERS.length} thợ và ${created} khách`);
}

// ---------- 3. Lịch hẹn (bookings + booking_services) ----------
const NOTES = [
  "Cắt ngắn hai bên, giữ phần đỉnh",
  "Muốn kiểu giống ảnh đã gửi",
  "Gội nhẹ, không dùng keo",
  "Hẹn đến sớm 5 phút",
  null,
  null,
  null,
];

async function seedBookings() {
  const { count, error: countError } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;
  const need = TARGET - (count ?? 0);
  if (need <= 0) {
    console.log(`= bookings đã có ${count} dòng, bỏ qua`);
    return;
  }

  const [{ data: barbers, error: bErr }, { data: customers, error: cErr }, { data: services, error: sErr }] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("role", "barber").eq("is_locked", false),
      supabase.from("profiles").select("id").eq("role", "customer"),
      supabase.from("services").select("id, price, duration_minutes").eq("is_active", true),
    ]);
  if (bErr || cErr || sErr) throw bErr || cErr || sErr;
  if (!barbers.length || !customers.length || !services.length) {
    throw new Error("Cần có thợ, khách và dịch vụ trước khi tạo lịch hẹn");
  }

  // Các khoảng giờ đã bận (không tính lịch đã hủy) để không vi phạm bookings_no_overlap
  const { data: busyRows, error: busyErr } = await supabase
    .from("bookings")
    .select("barber_id, booking_date, start_time, end_time")
    .neq("status", "cancelled");
  if (busyErr) throw busyErr;
  const busy = new Map(); // key: barberId|date -> [[start,end], ...] (phút)
  const addBusy = (barberId, date, s, e) => {
    const key = `${barberId}|${date}`;
    if (!busy.has(key)) busy.set(key, []);
    busy.get(key).push([s, e]);
  };
  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  for (const r of busyRows) addBusy(r.barber_id, r.booking_date, toMin(r.start_time), toMin(r.end_time));

  const today = todayVN();
  const nowMin = nowMinutesVN();
  const bookings = [];
  const links = [];
  let attempts = 0;

  while (bookings.length < need && attempts < need * 50) {
    attempts++;
    const offset = Math.floor(random() * 27) - 12; // từ 12 ngày trước đến 14 ngày sau
    const date = addDays(today, offset);
    const barber = pick(barbers);

    // 1–2 dịch vụ khác nhau
    const svcCount = random() < 0.35 ? 2 : 1;
    const picked = shuffle(services).slice(0, svcCount);
    const duration = picked.reduce((sum, s) => sum + s.duration_minutes, 0);
    const total = picked.reduce((sum, s) => sum + s.price, 0);
    if (duration <= 0 || duration > SCHEDULE_END - SCHEDULE_START) continue;

    // Chọn giờ bắt đầu trống, không trùng lịch đã có
    const key = `${barber.id}|${date}`;
    const taken = busy.get(key) ?? [];
    const starts = [];
    for (let s = SCHEDULE_START; s + duration <= SCHEDULE_END; s += SLOT_STEP) starts.push(s);
    const start = shuffle(starts).find((s) => {
      if (date === today && s <= nowMin) return false; // giờ đã qua trong ngày hôm nay
      const e = s + duration;
      return !taken.some(([bs, be]) => s < be && e > bs);
    });
    if (start === undefined) continue;

    const end = start + duration;
    addBusy(barber.id, date, start, end);

    // Trạng thái theo thời điểm: quá khứ thì hoàn thành/hủy, tương lai thì chờ/xác nhận
    let status;
    if (offset < 0) status = random() < 0.8 ? "completed" : "cancelled";
    else if (offset === 0) status = random() < 0.5 ? "confirmed" : "pending";
    else status = random() < 0.3 ? "pending" : "confirmed";

    const bookingId = randomUUID();
    bookings.push({
      id: bookingId,
      customer_id: pick(customers).id,
      barber_id: barber.id,
      booking_date: date,
      start_time: toHHMMSS(start),
      end_time: toHHMMSS(end),
      total_price: total,
      status,
      notes: pick(NOTES),
    });
    for (const s of picked) {
      links.push({ booking_id: bookingId, service_id: s.id, price_at_booking: s.price });
    }
  }

  if (bookings.length === 0) {
    console.log("! Không tìm được khung giờ trống nào để tạo lịch hẹn");
    return;
  }

  // Chèn theo lô: bookings trước (vì booking_services tham chiếu bookings)
  for (const part of chunk(bookings, 50)) {
    const { error } = await supabase.from("bookings").insert(part);
    if (error) throw new Error(`bookings: ${error.message}`);
  }
  for (const part of chunk(links, 100)) {
    const { error } = await supabase.from("booking_services").insert(part);
    if (error) throw new Error(`booking_services: ${error.message}`);
  }
  console.log(`+ bookings: thêm ${bookings.length} lịch hẹn, ${links.length} dòng booking_services`);
}

try {
  await seedServices();
  await seedAccounts();
  await seedBookings();
  console.log(`\nXong. Mật khẩu các tài khoản mới: ${PASSWORD}`);
} catch (err) {
  console.error("\nSeed thất bại:", err instanceof Error ? err.message : err);
  process.exit(1);
}
