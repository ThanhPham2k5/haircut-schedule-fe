"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FieldError, errorRing } from "@/components/FieldError";
import { useAuth, ROLE_NAMES } from "@/providers/auth-provider";
import { reportError } from "@/lib/errors";
import { changePasswordSchema, profileSchema } from "@/lib/schemas";
import { validate, type FieldErrors } from "@/lib/validation";
import { toast } from "sonner";
import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Save,
  ShieldCheck,
  ArrowLeft,
  Scissors,
} from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { UserAvatar } from "@/components/UserAvatar";
import { PasswordInput } from "@/components/PasswordInput";

export default function ProfilePage() {
  return (
    <AuthGuard allowedRoles={["customer", "barber", "admin"]} pageTitle="Hồ sơ cá nhân">
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, updateProfile, changePassword } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone);
    setSpecialty(user.specialty ?? "");
    setBio(user.bio ?? "");
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const profileResult = validate(profileSchema, {
      fullName: name,
      phone,
      specialty: user.role === "barber" ? specialty : undefined,
      bio: user.role === "barber" ? bio : undefined,
    });
    const wantsPasswordChange = newPassword.length > 0 || confirmPassword.length > 0;
    const passwordResult = wantsPasswordChange
      ? validate(changePasswordSchema, { newPassword, confirmPassword })
      : null;

    const allErrors: FieldErrors = {
      ...profileResult.errors,
      ...(passwordResult ? passwordResult.errors : {}),
    };
    setErrors(allErrors);
    const firstError = Object.values(allErrors)[0];
    if (firstError || !profileResult.success) {
      toast.error(firstError ?? "Dữ liệu không hợp lệ");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        fullName: profileResult.data.fullName,
        phone: profileResult.data.phone,
        specialty: profileResult.data.specialty,
        bio: profileResult.data.bio,
      });
      if (passwordResult?.success) {
        await changePassword(passwordResult.data.newPassword);
        setNewPassword("");
        setConfirmPassword("");
      }
      toast.success("Đã cập nhật thông tin cá nhân thành công!");
    } catch (err) {
      reportError(err, "Không thể cập nhật thông tin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const getRoleLabel = () => ROLE_NAMES[user.role] ?? "Thành viên";

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background text-slate-100">
        <Navbar />

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-gold border border-amber-500/40 flex items-center justify-center">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Hồ Sơ Cá Nhân</h1>
                <p className="text-xs text-slate-400">
                  Xem và chỉnh sửa thông tin tài khoản của bạn trên hệ thống
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" asChild className="text-xs border-slate-700">
              <Link
                href={
                  user.role === "admin"
                    ? "/admin/dashboard"
                    : user.role === "barber"
                    ? "/barber/schedule"
                    : "/customer/appointments"
                }
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Quay lại
              </Link>
            </Button>
          </div>

          {/* Thẻ tổng quan tài khoản */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar name={user.name} role={user.role} size="xl" />
              <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{user.name}</span>
                <Badge variant="gold" className="text-[10px]">
                  {getRoleLabel()}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                <span
                  className={`flex items-center gap-1 ${user.isEmailVerified ? "text-ok" : "text-gold"}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {user.isEmailVerified ? "Email đã xác thực" : "Email chưa xác thực"}
                </span>
                <span>•</span>
                <span>Tài khoản đang hoạt động</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form chỉnh sửa thông tin */}
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
            Cập Nhật Thông Tin Tài Khoản
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-gold" />
                Họ và tên *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.fullName)}`}
              />
              <FieldError message={errors.fullName} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gold" />
                Số điện thoại liên hệ *
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.phone)}`}
              />
              <FieldError message={errors.phone} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                Địa chỉ Email (Định danh tài khoản)
              </Label>
              <Input
                value={user.email}
                disabled
                className="h-9 text-xs bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-gold" />
                Đổi mật khẩu mới (Bỏ trống nếu không đổi)
              </Label>
              <PasswordInput
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.newPassword)}`}
              />
              <FieldError message={errors.newPassword} />
            </div>
          </div>

          {newPassword.length > 0 && (
            <div className="space-y-1.5 sm:w-1/2">
              <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-gold" />
                Nhập lại mật khẩu mới
              </Label>
              <PasswordInput
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                preventPaste={true}
                placeholder="Nhập lại mật khẩu mới..."
                className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.confirmPassword)}`}
              />
              <FieldError message={errors.confirmPassword} />
            </div>
          )}

          {/* Dành riêng cho thợ cắt tóc */}
          {user.role === "barber" && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-gold" />
                  Kỹ năng chuyên môn
                </Label>
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ví dụ: Chuyên Fade & Tỉa tầng textured"
                  className="h-9 text-xs bg-slate-950 border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Giới thiệu tay nghề &amp; phong cách</Label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <FieldError message={errors.bio} />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-semibold gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? "Đang lưu..." : "Lưu Thông Tin Cá Nhân"}
            </Button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  </>
);
}
