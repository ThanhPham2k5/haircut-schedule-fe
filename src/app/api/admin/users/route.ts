import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminCreateUserSchema } from "@/lib/schemas";
import { z } from "zod";

/**
 * API chỉ dành cho Admin: tạo / xóa tài khoản (cần service role key nên không thể làm ở trình duyệt).
 * Luôn xác thực token của người gọi và kiểm tra vai trò 'admin' trong bảng profiles.
 */
export const runtime = "nodejs";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type ServiceClient = NonNullable<ReturnType<typeof getServiceClient>>;

async function requireAdmin(request: Request, supabase: ServiceClient) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return { error: "Chưa đăng nhập.", status: 401 } as const;

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", status: 401 } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_locked")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin" || profile.is_locked) {
    return { error: "Bạn không có quyền quản trị.", status: 403 } as const;
  }
  return { adminId: userData.user.id } as const;
}

const NOT_CONFIGURED = NextResponse.json(
  {
    error:
      "Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY. Thêm biến này vào .env.local rồi khởi động lại.",
  },
  { status: 500 }
);

export async function POST(request: Request) {
  const supabase = getServiceClient();
  if (!supabase) return NOT_CONFIGURED;

  const auth = await requireAdmin(request, supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const parsed = adminCreateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, phone: input.phone },
    // Vai trò đặt ở app_metadata (client không tự sửa được) - trigger handle_new_user đọc từ đây
    app_metadata: { role: input.role },
  });
  if (error || !data.user) {
    const exists = error?.code === "email_exists" || /already|registered/i.test(error?.message ?? "");
    return NextResponse.json(
      { error: exists ? "Email này đã được đăng ký." : error?.message ?? "Không tạo được tài khoản." },
      { status: exists ? 409 : 400 }
    );
  }

  if (input.role === "barber") {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        specialty: input.specialty || "Chuyên gia Cắt & Tạo kiểu",
        bio: input.bio || "Thợ cắt tóc tay nghề cao tại tiệm.",
      })
      .eq("id", data.user.id);
    if (profileError) {
      return NextResponse.json(
        { error: `Đã tạo tài khoản nhưng chưa lưu được hồ sơ thợ: ${profileError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ id: data.user.id }, { status: 201 });
}

const deleteSchema = z.object({ userId: z.string().uuid("Mã người dùng không hợp lệ") });

export async function DELETE(request: Request) {
  const supabase = getServiceClient();
  if (!supabase) return NOT_CONFIGURED;

  const auth = await requireAdmin(request, supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 }
    );
  }
  const { userId } = parsed.data;

  if (userId === auth.adminId) {
    return NextResponse.json({ error: "Không thể tự xóa tài khoản đang đăng nhập." }, { status: 400 });
  }

  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (target?.role === "admin") {
    return NextResponse.json({ error: "Không thể xóa tài khoản quản trị viên." }, { status: 400 });
  }
  if (target?.role === "barber") {
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("barber_id", userId);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Thợ này còn ${count} lịch hẹn. Hãy khóa tài khoản thay vì xóa để giữ lịch sử.` },
        { status: 409 }
      );
    }
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message ?? "Không xóa được tài khoản." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
