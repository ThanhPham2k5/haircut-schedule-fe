"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { useAuth, ROLE_NAMES } from "@/providers/auth-provider";
import { reportError } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "./UserAvatar";
import {
  User as UserIcon,
  Calendar,
  Briefcase,
  Shield,
  LogOut,
  ChevronDown,
  CheckCircle2,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";

interface UserDropdownProps {
  user: User;
}

export function UserDropdown({ user }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await signOut();
      toast.success("Đã đăng xuất tài khoản.");
      router.push("/");
    } catch (err) {
      reportError(err, "Không đăng xuất được. Vui lòng thử lại.");
    }
  };

  const getRoleLabel = () => ROLE_NAMES[user.role] ?? "Thành viên";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Nút bấm kích hoạt Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <UserAvatar name={user.name} role={user.role} size="sm" />
        <div className="text-left hidden sm:block">
          <span className="block text-xs font-bold text-white leading-tight">
            {user.name}
          </span>
          <span className="block text-[10px] text-gold font-mono">
            {getRoleLabel()}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-gold" : ""
          }`}
        />
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header trong menu */}
          <div className="p-2.5 pb-2 border-b border-slate-800 mb-1.5 flex items-center gap-3">
            <UserAvatar name={user.name} role={user.role} size="md" />
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              <Badge variant="gold" className="text-[9px] py-0 px-1.5 mt-0.5">
                {getRoleLabel()}
              </Badge>
            </div>
          </div>

          {/* Các mục chức năng gom hết vào dropdown */}
          <div className="space-y-1 text-xs">
            {/* Dành cho Khách hàng: Có cả Đặt lịch & Lịch hẹn */}
            {user.role === "customer" && (
              <>
                <Link
                  href="/customer/booking"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                >
                  <Scissors className="h-4 w-4 text-gold -rotate-45" />
                  <span>Đặt lịch cắt tóc</span>
                </Link>

                <Link
                  href="/customer/appointments"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                >
                  <Calendar className="h-4 w-4 text-gold" />
                  <span>Lịch hẹn của tôi</span>
                </Link>
              </>
            )}

            {/* Dành cho Thợ cắt tóc */}
            {user.role === "barber" && (
              <Link
                href="/barber/schedule"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors font-medium"
              >
                <Briefcase className="h-4 w-4 text-gold" />
                <span>Ca làm việc của tôi</span>
              </Link>
            )}

            {/* Dành cho Quản trị viên */}
            {user.role === "admin" && (
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors font-medium"
              >
                <Shield className="h-4 w-4 text-gold" />
                <span>Bảng quản trị tiệm</span>
              </Link>
            )}

            {/* Thông tin cá nhân (dùng chung cho mọi role) */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors font-medium"
            >
              <UserIcon className="h-4 w-4 text-gold" />
              <span>Thông tin cá nhân</span>
            </Link>
          </div>

          <div className="pt-1.5 mt-1.5 border-t border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-bad hover:bg-rose-500/10 transition-colors cursor-pointer text-left font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
