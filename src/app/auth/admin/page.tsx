"use client";

import { Shield } from "lucide-react";
import { RoleLoginPage } from "@/components/auth/RoleLoginPage";

export default function AdminAuthPage() {
  return (
    <RoleLoginPage
      role="admin"
      icon={<Shield className="h-6 w-6" />}
      badge="Bảo Mật Quản Trị Salon"
      title="Cổng Quản Trị Viên"
      subtitle="Khu vực bảo mật dành cho người điều hành quản lý salon"
      emailLabel="Email Quản Trị"
      emailPlaceholder="admin@vanguard.vn"
      passwordLabel="Mật khẩu bảo mật"
      submitLabel="Đăng Nhập Quản Trị"
      redirectTo="/admin/dashboard"
      enterLabel="Vào Thẳng Bảng Quản Trị"
      switchAccountLabel="Đăng Xuất Tài Khoản Này"
      welcome={(name) => `Chào mừng Quản trị viên ${name}!`}
    />
  );
}
