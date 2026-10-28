"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "light" ? "light" : "dark"}
      className="toaster group"
      // Hạ popup status xuống dưới header 64px để tránh che khuất thanh điều hướng
      offset={72}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-100 group-[.toaster]:border-slate-800 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl font-sans",
          description: "group-[.toast]:text-slate-400 text-xs",
          actionButton:
            "group-[.toast]:bg-amber-500 group-[.toast]:text-slate-950 font-semibold",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:text-slate-300",
          success:
            "group-[.toaster]:border-emerald-500/40 group-[.toaster]:text-ok",
          error:
            "group-[.toaster]:border-red-500/40 group-[.toaster]:text-bad",
          info:
            "group-[.toaster]:border-amber-500/40 group-[.toaster]:text-gold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
