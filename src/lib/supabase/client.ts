import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readClientEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return readClientEnv().ok;
}

/** Singleton phía trình duyệt. Chỉ khởi tạo khi thật sự cần (tránh lỗi lúc build nếu chưa có .env). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const parsed = readClientEnv();
  if (!parsed.ok) {
    throw new Error(
      `Chưa cấu hình Supabase: ${parsed.problems.join("; ")}. Xem file .env.example.`
    );
  }
  client = createClient(parsed.env.url, parsed.env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
