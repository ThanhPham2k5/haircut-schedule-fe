"use client";

import React from "react";
import { UserRole } from "@/lib/types";
import { User as UserIcon, Scissors, Shield } from "lucide-react";

interface UserAvatarProps {
  name?: string;
  role?: UserRole;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({
  name = "User",
  role = "customer",
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-xl",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };

  const getRoleStyle = () => {
    switch (role) {
      case "barber":
        return {
          bg: "bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-gold border border-amber-500/40",
          icon: <Scissors className={`${iconSizes[size]} -rotate-45`} />,
        };
      case "admin":
        return {
          bg: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 text-ok border border-emerald-500/40",
          icon: <Shield className={iconSizes[size]} />,
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-800 to-slate-900 text-slate-300 border border-slate-700",
          icon: <UserIcon className={iconSizes[size]} />,
        };
    }
  };

  const { bg, icon } = getRoleStyle();

  return (
    <div
      className={`rounded-xl flex items-center justify-center font-bold select-none shrink-0 shadow-sm ${sizeClasses[size]} ${bg} ${className}`}
      title={`${name} (${role})`}
    >
      {icon}
    </div>
  );
}
