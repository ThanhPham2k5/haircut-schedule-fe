"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, ArrowRight, Lock, LogOut, Mail } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PasswordInput } from "@/components/PasswordInput";
import { UserAvatar } from "@/components/UserAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FieldError, errorRing } from "@/components/FieldError";
import { useAuth } from "@/providers/auth-provider";
import { reportError } from "@/lib/errors";
import { loginSchema } from "@/lib/schemas";
import { validateWithToast, type FieldErrors } from "@/lib/validation";
import type { UserRole } from "@/lib/types";

interface RoleLoginPageProps {
  role: Extract<UserRole, "barber" | "admin">;
  icon: React.ReactNode;
  badge: string;
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  submitLabel: string;
  redirectTo: string;
  enterLabel: string;
  switchAccountLabel: string;
  welcome: (name: string) => string;
}

/** Trang đăng nhập dùng chung cho cổng Thợ (/auth/barber) và cổng Quản trị (/auth/admin). */
export function RoleLoginPage(props: RoleLoginPageProps) {
  const router = useRouter();
  const { user, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Đã đăng xuất. Bạn có thể đăng nhập tài khoản khác.");
    } catch (err) {
      reportError(err, "Không đăng xuất được. Vui lòng thử lại.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateWithToast(loginSchema, { email, password }, setErrors);
    if (!result.success) return;

    setSubmitting(true);
    try {
      const signedIn = await signIn(result.data.email, result.data.password, props.role);
      toast.success(props.welcome(signedIn.name));
      router.push(props.redirectTo);
    } catch (err) {
      reportError(err, "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-neutral-950 shadow-md mx-auto mb-2">
              {props.icon}
            </div>
            <Badge variant="gold">{props.badge}</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-white">{props.title}</h1>
            <p className="text-xs text-slate-400">{props.subtitle}</p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-center text-xs text-slate-400">
              Đang kiểm tra phiên đăng nhập...
            </div>
          ) : user ? (
            <div className="bg-slate-900/95 rounded-2xl border border-amber-500/40 p-6 shadow-2xl space-y-5 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 text-gold border border-amber-500/40 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Đang Có Phiên Đăng Nhập</h3>
                <p className="text-xs text-slate-400">
                  Tài khoản hiện tại: <strong className="text-white">{user.name}</strong> ({user.email})
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 text-xs">
                <UserAvatar name={user.name} role={user.role} size="md" />
              </div>

              <div className="space-y-2 pt-2">
                {user.role === props.role && (
                  <Button variant="gold" asChild className="w-full text-xs font-semibold">
                    <Link href={props.redirectTo}>{props.enterLabel} &rarr;</Link>
                  </Button>
                )}

                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full text-xs font-semibold gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {props.switchAccountLabel}
                </Button>

                {user.role !== props.role && (
                  <Button variant="outline" asChild className="w-full text-xs border-slate-700">
                    <Link href="/">
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                      Quay về Trang Chủ
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl backdrop-blur-md">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gold" />
                    {props.emailLabel}
                  </Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={props.emailPlaceholder}
                    className={`h-10 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.email)}`}
                  />
                  <FieldError message={errors.email} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-gold" />
                    {props.passwordLabel}
                  </Label>
                  <PasswordInput
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`h-10 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.password)}`}
                  />
                  <FieldError message={errors.password} />
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  disabled={submitting}
                  className="w-full h-10 text-xs font-semibold"
                >
                  {submitting ? "Đang đăng nhập..." : props.submitLabel}
                  {!submitting && <ArrowRight className="h-4 w-4 ml-1" />}
                </Button>
              </form>
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
