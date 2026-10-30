"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Thẻ trượt lên và hiện dần khi xuất hiện. Tắt hiệu ứng nếu người dùng bật "giảm chuyển động". */
export function FadeUp({ children, delay = 0, className }: FadeUpProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
