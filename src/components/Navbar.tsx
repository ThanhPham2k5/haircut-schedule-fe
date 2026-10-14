"use client";

import { getCurrentUser, logout } from "@/lib/auth";
import { User } from "@/lib/types";
import { LogOut, Scissors, UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/auth/customer");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-xl text-primary"
      >
        <Scissors className="h-6 w-6" />
        <span>BarberShop</span>
      </Link>

      {/* Navbar based on user role */}
      <nav className="hidden md:flex gap-6 text-sm font-medium">
        <Link href="/" className="transition-colors hover:text-primary">
          Trang chủ
        </Link>

        {user?.role === "customer" && (
          <>
            <Link
              href="/customer/booking"
              className="transition-colors hover:text-primary"
            >
              Đặt lịch
            </Link>

            <Link
              href="/customer"
              className="transition-colors hover:text-primary"
            >
              Lịch hẹn của tôi
            </Link>
          </>
        )}

        {user?.role === "barber" && (
          <Link
            href="/barber/schedule"
            className="transition-colors hover:text-primary"
          >
            Lịch phục vụ
          </Link>
        )}

        {user?.role === "admin" && (
          <Link
            href="/admin/dashboard"
            className="transition-colors hover:text-primary"
          >
            Quản trị Dashboard
          </Link>
        )}
      </nav>

      {/* User button */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              {user.full_name} ({user.role})
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Đăng xuất
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/auth/customer">
              <Button size="sm">Đăng nhập</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
