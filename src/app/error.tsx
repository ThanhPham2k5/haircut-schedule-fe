"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Trang hiện khi một trang con bị lỗi lúc chạy. Không dùng Navbar để tránh lỗi lặp lại. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-slate-100 px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-900/50">
          <AlertTriangle className="h-8 w-8 text-bad" />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs text-bad tracking-widest">CÓ LỖI XẢY RA</p>
          <h1 className="text-2xl font-bold text-white text-balance">Trang chưa tải được</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Có lỗi trong lúc xử lý. Bạn thử tải lại trang, nếu vẫn lỗi thì quay về trang chủ.
          </p>
          {error.digest && (
            <p className="font-mono text-[11px] text-slate-500">Mã lỗi: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="gold" onClick={() => reset()} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Thử lại
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto border-slate-700">
            <Link href="/">
              <Home className="h-4 w-4 mr-1.5" />
              Về trang chủ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
