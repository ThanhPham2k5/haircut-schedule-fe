import React from "react";
import { Database } from "lucide-react";

/** Hiện khi chưa cấu hình biến môi trường Supabase, thay vì để app crash khó hiểu. */
export function SetupNotice({ problems }: { problems: string[] }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-slate-100">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-amber-500/40 bg-slate-900/90 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 text-gold">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Chưa cấu hình Supabase</h1>
            <p className="text-xs text-slate-400">Cần thêm biến môi trường trước khi chạy ứng dụng</p>
          </div>
        </div>

        <ul className="list-disc space-y-1 pl-5 text-xs text-bad">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <ol className="list-decimal space-y-1.5 pl-5 text-xs text-slate-300">
          <li>
            Sao chép <code className="font-mono text-gold">.env.example</code> thành{" "}
            <code className="font-mono text-gold">.env.local</code>.
          </li>
          <li>
            Điền <code className="font-mono text-gold">NEXT_PUBLIC_SUPABASE_URL</code> và{" "}
            <code className="font-mono text-gold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (Supabase → Project
            Settings → API).
          </li>
          <li>
            Chạy <code className="font-mono text-gold">supabase/schema.sql</code> trong SQL Editor.
          </li>
          <li>
            Khởi động lại <code className="font-mono text-gold">npm run dev</code>.
          </li>
        </ol>
      </div>
    </div>
  );
}
