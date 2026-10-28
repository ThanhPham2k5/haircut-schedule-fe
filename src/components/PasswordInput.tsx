"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, InputProps } from "@/components/ui/input";
import { toast } from "sonner";

interface PasswordInputProps extends Omit<InputProps, "type"> {
  preventCopyPaste?: boolean;
  preventCopy?: boolean;
  preventPaste?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      preventCopyPaste = false,
      preventCopy = false,
      preventPaste = false,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const shouldBlockPaste = preventCopyPaste || preventPaste;
    const shouldBlockCopy = preventCopyPaste || preventCopy;

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (shouldBlockPaste) {
        e.preventDefault();
        toast.error("Vui lòng tự gõ lại mật khẩu để kiểm tra, không được dán!");
      }
    };

    const handleCopy = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (shouldBlockCopy) {
        e.preventDefault();
        toast.error("Vì mục đích kiểm tra bảo mật, không thể sao chép mật khẩu!");
      }
    };

    return (
      <div className="relative w-full">
        <Input
          {...props}
          ref={ref}
          type={showPassword ? "text" : "password"}
          onPaste={handlePaste}
          onCopy={handleCopy}
          onCut={handleCopy}
          className={`pr-10 ${className || ""}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
