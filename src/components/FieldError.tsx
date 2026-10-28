import React from "react";

/** Thông báo lỗi nằm dưới ô nhập (kết quả từ zod). */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[11px] font-medium text-bad">
      {message}
    </p>
  );
}

/** Thêm viền đỏ cho ô nhập khi có lỗi. */
export function errorRing(message?: string): string {
  return message ? "border-rose-500/70 focus-visible:ring-rose-400" : "";
}
