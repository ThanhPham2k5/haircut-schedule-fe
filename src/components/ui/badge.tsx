import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-amber-500/15 text-gold border border-amber-500/30",
        secondary:
          "border-transparent bg-slate-800 text-slate-300 border border-slate-700",
        destructive:
          "border-transparent bg-red-500/15 text-bad border border-red-500/30",
        outline: "text-slate-200 border border-slate-700",
        pending:
          "border-amber-500/40 bg-amber-500/15 text-gold shadow-sm shadow-amber-500/10",
        confirmed:
          "border-emerald-500/40 bg-emerald-500/15 text-ok shadow-sm shadow-emerald-500/10",
        in_progress:
          "border-cyan-500/40 bg-cyan-500/15 text-live shadow-sm shadow-cyan-500/10 animate-pulse",
        completed:
          "border-blue-500/40 bg-blue-500/15 text-info shadow-sm shadow-blue-500/10",
        cancelled:
          "border-rose-500/40 bg-rose-500/15 text-bad shadow-sm shadow-rose-500/10",
        gold:
          "border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-gold shadow-sm shadow-amber-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
