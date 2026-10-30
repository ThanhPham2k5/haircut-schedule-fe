"use client";

/**
 * Trang dự phòng khi chính layout gốc bị lỗi. Phải tự có <html> và <body>,
 * không dùng được Navbar hay các component của layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          padding: "16px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#f59e0b", letterSpacing: 2 }}>LỖI HỆ THỐNG</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0" }}>Ứng dụng gặp lỗi</h1>
          <p style={{ fontSize: 14, color: "#a3a3a3", lineHeight: 1.6 }}>
            Bạn thử tải lại trang. Nếu vẫn lỗi, liên hệ quản lý salon.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#737373", fontFamily: "monospace" }}>
              Mã lỗi: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#f59e0b",
              color: "#171717",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
