"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { UserDropdown } from "@/components/UserDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Ẩn Header trên tất cả các trang đăng nhập / đăng ký (/auth/...)
  if (pathname?.startsWith("/auth")) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Tên tiệm */}
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-transform active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-neutral-950 shadow-sm">
              <Scissors className="h-5 w-5 -rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-wide text-white uppercase">
                Vanguard &amp; Blade
              </span>
              <span className="text-[10px] tracking-widest text-gold uppercase font-mono">
                Tiệm Tóc Quý Ông
              </span>
            </div>
          </Link>

          {/* Khu vực Giao diện / Tài khoản / Đăng nhập / Đăng ký */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-800/80" />
            ) : user ? (
              <UserDropdown user={user} />
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 text-xs border-slate-700"
                >
                  <Link href="/auth/customer">
                    <LogIn className="h-3.5 w-3.5 mr-1" />
                    Đăng nhập
                  </Link>
                </Button>

                <Button variant="gold" size="sm" asChild className="h-8 text-xs">
                  <Link href="/auth/customer?mode=register">
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Đăng ký
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
