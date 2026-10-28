"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nút đổi sáng / tối: bấm một cái là chuyển luôn, không cần menu.
 * Lần đầu vào trang, giao diện lấy theo hệ thống (defaultTheme="system" ở Providers).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const nextLabel = isDark ? "sáng" : "tối";
  // Icon thể hiện giao diện đang dùng: mặt trăng khi đang tối, mặt trời khi đang sáng
  const CurrentIcon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Chuyển sang giao diện ${nextLabel}`}
      title={`Chuyển sang giao diện ${nextLabel}`}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 text-slate-300 transition-colors hover:border-amber-400 hover:text-gold cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400",
        className,
      )}
    >
      <CurrentIcon className="h-4 w-4" />
    </button>
  );
}
