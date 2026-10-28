// Tạo dữ liệu demo cho Supabase: tài khoản (admin / thợ / khách) + bảng giá dịch vụ.
// Chạy:  npm run seed   (cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local)
// An toàn khi chạy lại: tài khoản/dịch vụ đã có sẽ được bỏ qua.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "123456";

const ACCOUNTS = [
  { role: "admin", email: "admin@vanguard.vn", fullName: "Quản Trị Viên", phone: "0900000001" },
  {
    role: "barber",
    email: "long.le@vanguard.vn",
    fullName: "Lê Hoàng Long",
    phone: "0900000002",
    specialty: "Chuyên Fade & Tỉa tầng textured",
    bio: "10 năm kinh nghiệm, từng đạt giải barber trẻ xuất sắc.",
    rating: 4.9,
    reviewCount: 128,
  },
  {
    role: "barber",
    email: "minh.tran@vanguard.vn",
    fullName: "Trần Quang Minh",
    phone: "0900000003",
    specialty: "Cạo râu truyền thống & Cắt cổ điển",
    bio: "Tỉ mỉ, chuẩn phong cách quý ông cổ điển.",
    rating: 4.8,
    reviewCount: 96,
  },
  {
    role: "barber",
    email: "khoa.pham@vanguard.vn",
    fullName: "Phạm Anh Khoa",
    phone: "0900000004",
    specialty: "Uốn & Nhuộm tạo kiểu hiện đại",
    bio: "Cập nhật xu hướng tóc nam mới nhất.",
    rating: 4.7,
    reviewCount: 74,
  },
  { role: "customer", email: "khach@vanguard.vn", fullName: "Nguyễn Văn An", phone: "0988777666" },
];

const SERVICES = [
  { name: "Cắt Tóc Nam Cao Cấp", tagline: "Tạo kiểu theo gương mặt", description: "Tư vấn kiểu, cắt, gội và sấy tạo kiểu.", price: 120000, duration_minutes: 45, popular: true, category: "haircut", icon_name: "Scissors" },
  { name: "Cạo Râu & Tạo Dáng", tagline: "Khăn nóng thư giãn", description: "Cạo râu bằng dao truyền thống với khăn nóng.", price: 80000, duration_minutes: 30, popular: false, category: "beard", icon_name: "Sparkles" },
  { name: "Combo Cắt + Cạo Râu", tagline: "Trọn gói quý ông", description: "Cắt tóc cao cấp kèm cạo râu tạo dáng.", price: 180000, duration_minutes: 75, popular: true, category: "combo", icon_name: "Crown" },
  { name: "Uốn Tóc Nam Textured", tagline: "Bồng bềnh tự nhiên", description: "Uốn tạo độ phồng, giữ nếp lâu.", price: 450000, duration_minutes: 90, popular: false, category: "treatment", icon_name: "Wind" },
  { name: "Gội Đầu Dưỡng Sinh", tagline: "Thư giãn da đầu", description: "Gội thảo dược, massage đầu cổ vai gáy.", price: 100000, duration_minutes: 30, popular: false, category: "treatment", icon_name: "Droplets" },
];

async function seedAccounts() {
  const { data: list, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const existing = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]));

  for (const acc of ACCOUNTS) {
    let userId = existing.get(acc.email)?.id;
    if (userId) {
      console.log(`= ${acc.email} đã tồn tại, bỏ qua tạo mới`);
    } else {
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: PASSWORD,
        email_confirm: true,
        app_metadata: { role: acc.role },
        user_metadata: { full_name: acc.fullName, phone: acc.phone },
      });
      if (createError) throw new Error(`${acc.email}: ${createError.message}`);
      userId = data.user.id;
      console.log(`+ ${acc.role.padEnd(8)} ${acc.email}`);
    }

    if (acc.role === "barber") {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          specialty: acc.specialty,
          bio: acc.bio,
          rating: acc.rating,
          review_count: acc.reviewCount,
        })
        .eq("id", userId);
      if (updateError) throw new Error(`profile ${acc.email}: ${updateError.message}`);
    }
  }
}

async function seedServices() {
  const { count, error } = await supabase.from("services").select("id", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) {
    console.log(`= Bảng services đã có ${count} dịch vụ, bỏ qua`);
    return;
  }
  const { error: insertError } = await supabase.from("services").insert(SERVICES);
  if (insertError) throw insertError;
  console.log(`+ Đã thêm ${SERVICES.length} dịch vụ`);
}

try {
  await seedServices();
  await seedAccounts();
  console.log(`\nXong. Mật khẩu mọi tài khoản demo: ${PASSWORD}`);
} catch (err) {
  console.error("\nSeed thất bại:", err instanceof Error ? err.message : err);
  console.error("Bạn đã chạy supabase/schema.sql trong SQL Editor chưa?");
  process.exit(1);
}
