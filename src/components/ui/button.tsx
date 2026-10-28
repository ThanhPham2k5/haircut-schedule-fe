import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-500/20 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/30 active:scale-[0.98]",
        destructive:
          "bg-red-500 text-[#fff] shadow-sm hover:bg-red-600 active:scale-[0.98]",
        outline:
          "border border-slate-700 bg-slate-900/60 text-slate-200 backdrop-blur-sm hover:bg-slate-800 hover:text-white hover:border-slate-600 active:scale-[0.98]",
        secondary:
          "bg-slate-800 text-slate-100 hover:bg-slate-700 shadow-sm active:scale-[0.98]",
        ghost:
          "text-slate-300 hover:bg-slate-800/80 hover:text-white active:scale-[0.98]",
        link: "text-gold underline-offset-4 hover:underline",
        gold: "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-neutral-950 font-semibold shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98]",
        emerald:
          "bg-emerald-600 text-[#fff] font-medium hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
