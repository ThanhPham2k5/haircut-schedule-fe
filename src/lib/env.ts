import { z } from "zod";

const clientEnvSchema = z.object({
  url: z
    .string({ error: "Thiếu NEXT_PUBLIC_SUPABASE_URL" })
    .url("NEXT_PUBLIC_SUPABASE_URL phải là một URL hợp lệ"),
  anonKey: z
    .string({ error: "Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY" })
    .min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY không hợp lệ"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Next.js chỉ nhúng biến NEXT_PUBLIC_* khi được tham chiếu trực tiếp
 * (process.env.TEN_BIEN), nên không được truy cập động theo key.
 */
export function readClientEnv():
  | { ok: true; env: ClientEnv }
  | { ok: false; problems: string[] } {
  const result = clientEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (result.success) return { ok: true, env: result.data };
  return {
    ok: false,
    problems: result.error.issues.map((issue) => issue.message),
  };
}
