"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Lock,
  LogOut,
  Mail,
  Phone,
  RotateCcw,
  Scissors,
  User as UserIcon,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PasswordInput } from "@/components/PasswordInput";
import { UserAvatar } from "@/components/UserAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FieldError, errorRing } from "@/components/FieldError";
import { useAuth, ROLE_NAMES } from "@/providers/auth-provider";
import { getErrorMessage, reportError } from "@/lib/errors";
import { loginSchema, registerSchema } from "@/lib/schemas";
import { validateWithToast, type FieldErrors } from "@/lib/validation";

function getSafeRedirect(): string {
  if (typeof window === "undefined") return "/customer/booking";
  const target = new URLSearchParams(window.location.search).get("redirect");
  // Chỉ cho phép đường dẫn nội bộ, chặn open-redirect (//evil.com)
  return target && target.startsWith("/") && !target.startsWith("//")
    ? target
    : "/customer/booking";
}

export default function CustomerAuthPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp, resendSignupOtp, signOut } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"form" | "check-email">("form");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Form đăng nhập
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Form đăng ký (có nhập lại mật khẩu)
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRepassword, setRegRepassword] = useState("");

  // Xác thực OTP
  const [otpEmail, setOtpEmail] = useState("");

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("mode") === "register"
    ) {
      setMode("register");
    }
  }, []);

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setStep("form");
    setErrors({});
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(
        "Đã đăng xuất. Bạn có thể đăng nhập hoặc tạo tài khoản mới.",
      );
    } catch (err) {
      reportError(err, "Không đăng xuất được. Vui lòng thử lại.");
    }
  };

  // Đăng nhập
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateWithToast(
      loginSchema,
      { email: loginEmail, password: loginPassword },
      setErrors,
    );
    if (!result.success) return;

    setSubmitting(true);
    try {
      const signedIn = await signIn(
        result.data.email,
        result.data.password,
        "customer",
      );
      toast.success(`Chào mừng quý khách ${signedIn.name}!`);
      router.push(getSafeRedirect());
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Đăng nhập thất bại. Vui lòng thử lại.",
      );
      const code = (err as { code?: string } | null)?.code;
      if (code === "email_not_confirmed") {
        setOtpEmail(result.data.email);
        setMode("register");
        setStep("check-email");
        toast.error(message);
        try {
          await resendSignupOtp(result.data.email);
          toast.info("Đã gửi lại email xác nhận tới hộp thư của bạn.");
        } catch (resendErr) {
          reportError(resendErr, "Không gửi lại được mã xác thực.");
        }
      } else {
        reportError(err, "Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Đăng ký bước 1: kiểm tra dữ liệu & gửi mã OTP qua email
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateWithToast(
      registerSchema,
      {
        fullName: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        confirmPassword: regRepassword,
      },
      setErrors,
    );
    if (!result.success) return;

    setSubmitting(true);
    try {
      const { needsVerification } = await signUp({
        fullName: result.data.fullName,
        email: result.data.email,
        phone: result.data.phone,
        password: result.data.password,
      });
      if (needsVerification) {
        setOtpEmail(result.data.email);
        setStep("check-email");
        toast.success("Đã gửi email xác nhận!", {
          description:
            "Vui lòng mở hộp thư (cả mục Spam) và nhấn vào liên kết.",
        });
      } else {
        toast.success("Đăng ký thành công!");
        router.push(getSafeRedirect());
      }
    } catch (err) {
      reportError(err, "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Gửi lại email xác thực
  const handleResendEmail = async () => {
    setSubmitting(true);
    try {
      await resendSignupOtp(otpEmail);
      toast.success("Đã gửi lại email xác nhận!");
    } catch (err) {
      reportError(err, "Không gửi lại được email xác nhận.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (active: boolean) =>
    `py-2 text-xs font-semibold rounded-lg transition-all ${
      active
        ? "bg-amber-500 text-neutral-950 shadow-sm"
        : "text-slate-400 hover:text-white"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Logo & Tiêu đề */}
          <div className="text-center space-y-2">
            <Link
              href="/"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-neutral-950 shadow-md mx-auto mb-2 transition-transform active:scale-95"
            >
              <Scissors className="h-6 w-6 -rotate-45" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cổng Tài Khoản Khách Hàng
            </h1>
            <p className="text-xs text-slate-400">
              Đăng nhập hoặc đăng ký để đặt lịch hẹn cắt tóc chu đáo nhất
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-center text-xs text-slate-400">
              Đang kiểm tra phiên đăng nhập...
            </div>
          ) : user ? (
            /* ĐANG ĐĂNG NHẬP SẴN -> BẮT BUỘC ĐĂNG XUẤT TRƯỚC KHI ĐỔI TÀI KHOẢN */
            <div className="bg-slate-900/95 rounded-2xl border border-amber-500/40 p-6 shadow-2xl space-y-5 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 text-gold border border-amber-500/40 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Bạn Đang Đăng Nhập Hệ Thống
                </h3>
                <p className="text-xs text-slate-400">
                  Hiện bạn đang duy trì phiên đăng nhập với tài khoản:
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-left flex items-center gap-3">
                <UserAvatar name={user.name} role={user.role} size="md" />
                <div>
                  <span className="font-bold text-white block">
                    {user.name}
                  </span>
                  <span className="text-slate-400 block font-mono">
                    {user.email}
                  </span>
                  <Badge variant="gold" className="text-[9px] mt-1 py-0">
                    {ROLE_NAMES[user.role]}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-gold/90 leading-relaxed">
                Để đăng nhập bằng tài khoản khác hoặc tạo tài khoản mới, bạn cần
                đăng xuất tài khoản hiện tại.
              </p>

              <div className="space-y-2 pt-2">
                {user.role === "customer" && (
                  <Button
                    variant="gold"
                    asChild
                    className="w-full text-xs font-semibold"
                  >
                    <Link href="/customer/booking">Đặt Lịch Ngay &rarr;</Link>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full text-xs font-semibold gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng Xuất Tài Khoản Này
                </Button>

                <Button
                  variant="outline"
                  asChild
                  className="w-full text-xs border-slate-700"
                >
                  <Link href="/">
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Quay về Trang Chủ
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl backdrop-blur-md">
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={tabClass(mode === "login")}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={tabClass(mode === "register")}
                >
                  Đăng Ký Mới
                </button>
              </div>

              {/* TAB 1: ĐĂNG NHẬP */}
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gold" />
                      Địa chỉ Email
                    </Label>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="vidu@gmail.com"
                      className={`h-10 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.email)}`}
                    />
                    <FieldError message={errors.email} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-gold" />
                      Mật khẩu
                    </Label>
                    <PasswordInput
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className={`h-10 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.password)}`}
                    />
                    <FieldError message={errors.password} />
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    disabled={submitting}
                    className="w-full h-10 text-xs font-semibold mt-2"
                  >
                    {submitting ? "Đang đăng nhập..." : "Đăng Nhập Ngay"}
                    {!submitting && <ArrowRight className="h-4 w-4 ml-1" />}
                  </Button>
                </form>
              )}

              {/* TAB 2: ĐĂNG KÝ */}
              {mode === "register" && step === "form" && (
                <form
                  onSubmit={handleRegister}
                  className="space-y-3"
                  noValidate
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-gold" />
                      Họ và tên quý khách *
                    </Label>
                    <Input
                      autoComplete="name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ví dụ: Hoàng Gia Bảo"
                      className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.fullName)}`}
                    />
                    <FieldError message={errors.fullName} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gold" />
                      Email nhận mã xác thực *
                    </Label>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="tenban@gmail.com"
                      className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.email)}`}
                    />
                    <FieldError message={errors.email} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gold" />
                      Số điện thoại *
                    </Label>
                    <Input
                      type="tel"
                      autoComplete="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="09xx xxx xxx"
                      className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.phone)}`}
                    />
                    <FieldError message={errors.phone} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-gold" />
                        Mật khẩu *
                      </Label>
                      <PasswordInput
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        preventCopy={true}
                        className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.password)}`}
                      />
                      <FieldError message={errors.password} />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-gold" />
                        Nhập lại mật khẩu *
                      </Label>
                      <PasswordInput
                        autoComplete="new-password"
                        value={regRepassword}
                        onChange={(e) => setRegRepassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        preventPaste={true}
                        className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.confirmPassword)}`}
                      />
                      <FieldError message={errors.confirmPassword} />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    disabled={submitting}
                    className="w-full h-10 text-xs font-semibold mt-2"
                  >
                    {submitting
                      ? "Đang gửi email xác thực..."
                      : "Tiếp Tục Nhận Mã Xác Thực Email"}
                    {!submitting && <ArrowRight className="h-4 w-4 ml-1" />}
                  </Button>
                </form>
              )}

              {/* BƯỚC CHỜ XÁC NHẬN EMAIL */}
              {mode === "register" && step === "check-email" && (
                <div className="space-y-5 text-center">
                  <div className="h-12 w-12 rounded-full bg-amber-500/20 text-gold border border-amber-500/40 flex items-center justify-center mx-auto">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">
                      Kiểm tra email của bạn
                    </h3>
                    <p className="text-xs text-slate-400 break-all">
                      Chúng tôi đã gửi liên kết xác nhận tới{" "}
                      <span className="text-gold">{otpEmail}</span>.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Nhấn vào liên kết trong email để kích hoạt tài khoản. Nhớ
                      kiểm tra cả mục Spam.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={submitting}
                      onClick={handleResendEmail}
                      className="text-xs border-slate-700 flex-1 hover:border-amber-400"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Gửi lại email
                    </Button>
                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => {
                        setLoginEmail(otpEmail);
                        setMode("login");
                        setStep("form");
                        setErrors({});
                      }}
                    >
                      Đã xác nhận, đăng nhập
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!user && !loading && (
            <div className="text-center text-xs text-slate-400 pt-2">
              <Link href="/" className="hover:text-slate-200">
                &larr; Quay lại trang chủ
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
