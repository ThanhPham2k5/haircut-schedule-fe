"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportError } from "@/lib/errors";

interface Options {
  /** false = chưa tải (ví dụ đang chờ đăng nhập) */
  enabled?: boolean;
  errorMessage?: string;
}

/**
 * Tải dữ liệu bất đồng bộ + loading + toast lỗi.
 * `fetcher` PHẢI được bọc useCallback ở nơi gọi để tránh tải lặp.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, options: Options = {}) {
  const { enabled = true, errorMessage } = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await fetcher();
      if (id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err);
      reportError(err, errorMessage ?? "Không tải được dữ liệu. Vui lòng thử lại.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [fetcher, errorMessage]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void run();
    return () => {
      requestId.current++;
    };
  }, [enabled, run]);

  return { data, loading, error, reload: run, setData };
}
