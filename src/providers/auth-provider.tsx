"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { AppError, reportError } from "@/lib/errors";
import {
  fetchProfile,
  updateProfile as updateProfileRequest,
  type ProfilePatch,
} from "@/lib/data";
import type { User, UserRole } from "@/lib/types";

const ROLE_NAMES: Record<UserRole, string> = {
  admin: "Quản trị viên",
  barber: "Thợ cắt tóc",
  customer: "Khách hàng",
};

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  /** true khi đang khôi phục phiên / tải hồ sơ lần đầu */
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    requiredRole?: UserRole,
  ) => Promise<User>;
  /** needsVerification = true nghĩa là Supabase đã gửi mã OTP tới email */
  signUp: (input: RegisterInput) => Promise<{ needsVerification: boolean }>;
  resendSignupOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<User>;
  changePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileStatus = "idle" | "loading" | "ready" | "error";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<User | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [reloadKey, setReloadKey] = useState(0);

  // 1) Khôi phục phiên + lắng nghe thay đổi đăng nhập / đăng xuất
  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setInitializing(false);
      })
      .catch((err) => {
        if (!active) return;
        reportError(err, "Không khôi phục được phiên đăng nhập.");
        setInitializing(false);
      });

    // Không await truy vấn Supabase trong callback này (dễ gây deadlock) - chỉ lưu session.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitializing(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  // 2) Mỗi khi đổi người dùng -> tải hồ sơ (profiles)
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileStatus("idle");
      return;
    }
    let cancelled = false;
    setProfileStatus("loading");
    fetchProfile(userId)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setProfileStatus(p ? "ready" : "error");
      })
      .catch((err) => {
        if (cancelled) return;
        setProfile(null);
        setProfileStatus("error");
        reportError(err, "Không tải được hồ sơ người dùng.");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const loading =
    initializing ||
    (userId !== null &&
      (profileStatus === "idle" || profileStatus === "loading"));

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (email, password, requiredRole) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const prof = await fetchProfile(data.user.id);
      if (!prof) {
        await supabase.auth.signOut();
        throw new AppError(
          "Không tìm thấy hồ sơ tài khoản. Vui lòng liên hệ quản lý salon.",
        );
      }
      if (prof.isLocked) {
        await supabase.auth.signOut();
        throw new AppError(
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản lý salon.",
        );
      }
      if (requiredRole && prof.role !== requiredRole) {
        await supabase.auth.signOut();
        throw new AppError(
          `Tài khoản này là ${ROLE_NAMES[prof.role]}. Không thể đăng nhập tại đây.`,
        );
      }
      setProfile(prof);
      setProfileStatus("ready");
      return prof;
    },
    [supabase],
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (input) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.fullName, phone: input.phone },
          emailRedirectTo: `${window.location.origin}/customer/booking`,
        },
      });
      if (error) throw error;
      // Email đã tồn tại: Supabase trả về user giả với identities rỗng (chống dò email)
      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        throw new AppError(
          "Email này đã được đăng ký. Vui lòng chuyển sang Đăng Nhập.",
        );
      }
      return { needsVerification: !data.session };
    },
    [supabase],
  );

  const resendSignupOtp = useCallback<AuthContextValue["resendSignupOtp"]>(
    async (email) => {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setProfileStatus("idle");
  }, [supabase]);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(
    async (patch) => {
      if (!userId) throw new AppError("Bạn chưa đăng nhập.");
      const updated = await updateProfileRequest(userId, patch);
      setProfile(updated);
      return updated;
    },
    [userId],
  );

  const changePassword = useCallback<AuthContextValue["changePassword"]>(
    async (newPassword) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    setReloadKey((k) => k + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profile,
      loading,
      signIn,
      signUp,
      resendSignupOtp,
      signOut,
      updateProfile,
      changePassword,
      refreshProfile,
    }),
    [
      profile,
      loading,
      signIn,
      signUp,
      resendSignupOtp,
      signOut,
      updateProfile,
      changePassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  return ctx;
}

export { ROLE_NAMES };
