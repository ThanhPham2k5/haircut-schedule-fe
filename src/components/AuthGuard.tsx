"use client";

import { getCurrentUser } from "@/lib/auth";
import { Role } from "@/lib/types";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowRoles?: Role[];
}

export default function AuthGuard({ children, allowRoles }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      router.push("/auth/customer");
      return;
    }

    if (allowRoles && !allowRoles.includes(user.role)) {
      router.push("/");
      return;
    }

    setIsAuthorized(true);
  }, [router, allowRoles]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>

          <p className="text-muted-foreground text-sm">
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );

    return <>{children}</>;
  }
}
