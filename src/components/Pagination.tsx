"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Hiện tối đa 4 số trang liền nhau, luôn chứa trang hiện tại: 1 2 3 4 / 3 4 5 6 / ... */
const PAGE_WINDOW = 4;
function getPageItems(current: number, total: number): number[] {
  const size = Math.min(PAGE_WINDOW, total);
  const start = Math.min(Math.max(1, current - 1), total - size + 1);
  return Array.from({ length: size }, (_, i) => start + i);
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Thanh phân trang: « ‹ 1 2 3 … 9 › » và ô nhập số trang.
 * Không hiện gì khi chỉ có 1 trang.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const [jump, setJump] = useState("");
  if (totalPages <= 1) return null;

  const go = (target: number) => {
    const clamped = Math.min(Math.max(1, target), totalPages);
    if (clamped !== page) onPageChange(clamped);
  };

  const navBtn = "h-8 w-8 p-0 border-slate-700";

  return (
    <nav
      aria-label="Phân trang"
      className={cn("flex flex-col items-center gap-3", className)}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={navBtn}
          disabled={page <= 1}
          onClick={() => go(1)}
          aria-label="Trang đầu"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={navBtn}
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {getPageItems(page, totalPages).map((item) => (
          <Button
            key={item}
            type="button"
            variant={item === page ? "gold" : "outline"}
            size="sm"
            className={cn(
              "h-8 min-w-8 px-2.5 text-xs",
              item !== page && "border-slate-700",
            )}
            onClick={() => go(item)}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </Button>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={navBtn}
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={navBtn}
          disabled={page >= totalPages}
          onClick={() => go(totalPages)}
          aria-label="Trang cuối"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form
        className="flex items-center gap-2 text-xs text-slate-400"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(jump);
          if (Number.isInteger(n) && n >= 1 && n <= totalPages) go(n);
          setJump("");
        }}
      >
        <span>Đi tới trang</span>
        <Input
          type="number"
          min={1}
          max={totalPages}
          inputMode="numeric"
          value={jump}
          onChange={(e) => setJump(e.target.value)}
          placeholder={String(page)}
          aria-label="Nhập số trang"
          className="h-8 w-16 text-center text-xs bg-slate-950 border-slate-800"
        />
        <span>/ {totalPages}</span>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="h-8 text-xs border-slate-700"
        >
          Đi
        </Button>
      </form>
    </nav>
  );
}

/**
 * Chia danh sách thành từng trang. Tự quay về trang 1 khi resetKey đổi
 * (ví dụ khi người dùng gõ tìm kiếm hoặc đổi bộ lọc).
 */
export function usePagination<T>(
  items: T[],
  pageSize: number,
  resetKey: string,
) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);

  return { page: current, setPage, totalPages, pageItems };
}
