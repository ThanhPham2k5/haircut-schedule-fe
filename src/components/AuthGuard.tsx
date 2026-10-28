"use client";

import React from "react";
import { UserRole } from "@/lib/types";
import { useAuth, ROLE_NAMES } from "@/providers/auth-provider";
import { reportError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Lock, ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { toast } from "sonner";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  pageTitle?: string;
}

export function AuthGuard({
  children,
  allowedRoles = ["customer", "barber", "admin"],
  pageTitle = "Trang được bảo vệ",
}: AuthGuardProps) {
  const { user, loading, signOut } = useAuth();

  const logout = async () => {
    try {
      await signOut();
    } catch (err) {
      reportError(err, "Không đăng xuất được. Vui lòng thử lại.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-slate-400 text-xs">
        Đang xác thực quyền truy cập...
      </div>
    );
  }

  const roleNames = ROLE_NAMES;

  const getLoginUrl = () => {
    if (allowedRoles.includes("admin") && !allowedRoles.includes("customer")) {
      return "/auth/admin";
    }
    if (allowedRoles.includes("barber") && !allowedRoles.includes("customer")) {
      return "/auth/barber";
    }
    return "/auth/customer";
  };

  // 1. Trường hợp chưa đăng nhập
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-slate-100">
        <Navbar />

        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-2xl text-center space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-gold border border-amber-500/40 flex items-center justify-center mx-auto shadow-md">
              <Lock className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <Badge variant="gold" className="text-[10px]">
                Yêu Cầu Xác Thực
              </Badge>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Khu Vực Hạn Chế Truy Cập
              </h2>
              <p className="text-xs text-slate-400">
                Trang này yêu cầu đăng nhập với quyền{" "}
                <strong className="text-gold">
                  {allowedRoles.map((r) => roleNames[r]).join(" hoặc ")}
                </strong>{" "}
                để tiếp tục.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button variant="gold" asChild className="w-full text-xs font-semibold">
                <Link href={getLoginUrl()}>
                  Đăng Nhập Để Truy Cập
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full text-xs border-slate-700">
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Quay về Trang Chủ
                </Link>
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // 2. Trường hợp tài khoản bị khóa
  if (user.isLocked) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-slate-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/40 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-bad mx-auto" />
            <h2 className="text-lg font-bold text-white">Tài Khoản Đã Bị Khóa</h2>
            <p className="text-xs text-slate-400">
              Tài khoản của bạn đã bị tạm khóa bởi quản lý salon. Vui lòng liên hệ để được hỗ trợ.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                toast.info("Đã đăng xuất");
              }}
              className="text-xs"
            >
              Đăng xuất
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 3. Trường hợp sai vai trò
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-slate-100">
        <Navbar />

        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900/90 border border-rose-500/40 shadow-2xl text-center space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-rose-500/20 text-bad border border-rose-500/40 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <Badge variant="destructive" className="text-[10px]">
                Từ Chối Quyền Truy Cập
              </Badge>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Không Đủ Thẩm Quyền
              </h2>
              <p className="text-xs text-slate-400">
                Tài khoản hiện tại của bạn là{" "}
                <strong className="text-white">{roleNames[user.role]}</strong>.
                Trang này chỉ dành cho{" "}
                <strong className="text-gold">
                  {allowedRoles.map((r) => roleNames[r]).join(" hoặc ")}
                </strong>.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="destructive"
                onClick={async () => {
                  await logout();
                  toast.success("Đã đăng xuất. Vui lòng đăng nhập bằng tài khoản khác.");
                }}
                className="w-full text-xs font-semibold gap-2"
              >
                <LogOut className="h-4 w-4" />
                Đăng Xuất Tài Khoản Này
              </Button>

              <Button variant="outline" asChild className="w-full text-xs border-slate-700">
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Quay về Trang Chủ
                </Link>
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // 4. Đúng quyền truy cập -> Hiển thị trang
  return <>{children}</>;
}
