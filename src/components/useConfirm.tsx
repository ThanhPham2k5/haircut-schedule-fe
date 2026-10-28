"use client";

import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true: nút xác nhận màu đỏ (xóa, khóa, hủy). false: màu vàng (mở lại, xác nhận thường). */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Hộp xác nhận dùng chung thay cho window.confirm().
 *   const { ask, confirmDialog } = useConfirm();
 *   ask({ title: "Xóa ...?", destructive: true, onConfirm: () => doDelete() });
 *   ...
 *   return <>... {confirmDialog}</>;
 */
export function useConfirm() {
  // Giữ lại nội dung cũ khi đóng để hộp không bị trống chữ lúc đang mờ dần
  const [state, setState] = useState<{
    opts: ConfirmOptions | null;
    open: boolean;
  }>({
    opts: null,
    open: false,
  });

  const ask = useCallback(
    (opts: ConfirmOptions) => setState({ opts, open: true }),
    [],
  );
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const confirmDialog = (
    <Dialog open={state.open} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-sm border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white">
            {state.opts?.title}
          </DialogTitle>
          {state.opts?.description && (
            <DialogDescription className="text-xs text-slate-400 leading-relaxed">
              {state.opts.description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={close}
            className="text-xs border-slate-700"
          >
            {state.opts?.cancelLabel ?? "Hủy bỏ"}
          </Button>
          <Button
            type="button"
            variant={state.opts?.destructive ? "destructive" : "gold"}
            size="sm"
            className="text-xs"
            onClick={() => {
              const action = state.opts?.onConfirm;
              close();
              if (action) void action();
            }}
          >
            {state.opts?.confirmLabel ?? "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { ask, confirmDialog };
}
