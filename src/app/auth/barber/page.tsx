"use client";

import { Briefcase } from "lucide-react";
import { RoleLoginPage } from "@/components/auth/RoleLoginPage";

export default function BarberAuthPage() {
  return (
    <RoleLoginPage
      role="barber"
      icon={<Briefcase className="h-6 w-6" />}
      badge="Cổng Thợ Cắt Tóc"
      title="Đăng Nhập Ca Làm Việc"
      subtitle="Khu vực dành riêng cho Master Barber nhận ca và quản lý phục vụ"
      emailLabel="Email của Thợ"
      emailPlaceholder="long.le@vanguard.vn"
      passwordLabel="Mật khẩu"
      submitLabel="Đăng Nhập Vào Ca"
      redirectTo="/barber/schedule"
      enterLabel="Vào Thẳng Ca Làm Việc"
      switchAccountLabel="Đăng Xuất Để Đổi Tài Khoản"
      welcome={(name) => `Chào mừng thợ ${name} vào ca!`}
    />
  );
}
