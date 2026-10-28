"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { isToday, isFuture, isPast, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  XCircle,
  Plus,
  Filter,
  RotateCcw,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { fetchBarbers, fetchBookings, setBookingStatus } from "@/lib/data";
import { formatVND, formatDateVN, shortBookingCode } from "@/lib/format";
import { getStatusLabel, getStatusBadgeVariant } from "@/lib/statusHelper";
import { reportError } from "@/lib/errors";
import { useAsyncData } from "@/hooks/use-async-data";
import { useAuth } from "@/providers/auth-provider";
import { useConfirm } from "@/components/useConfirm";

export default function CustomerAppointmentsPage() {
  return (
    <AuthGuard allowedRoles={["customer"]} pageTitle="Lịch hẹn của tôi">
      <AppointmentsContent />
    </AuthGuard>
  );
}

function AppointmentsContent() {
  const { user } = useAuth();

  const loadBookings = useCallback(() => fetchBookings(), []);
  const loadBarbers = useCallback(() => fetchBarbers(), []);
  const {
    data: allBookings = [],
    loading,
    reload,
  } = useAsyncData(loadBookings, {
    errorMessage: "Không tải được lịch hẹn của bạn.",
  });
  const { data: barbers = [] } = useAsyncData(loadBarbers, {
    errorMessage: "Không tải được danh sách thợ.",
  });

  // Các bộ lọc (Thời gian, Thợ, Trạng thái)
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [barberFilter, setBarberFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { ask, confirmDialog } = useConfirm();

  const barberById = useMemo(
    () => new Map(barbers.map((b) => [b.id, b])),
    [barbers],
  );

  // RLS đã chỉ trả về lịch của chính khách này; ở đây chỉ áp dụng bộ lọc hiển thị
  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (barberFilter !== "all" && b.barberId !== barberFilter) return false;

      if (timeFilter !== "all") {
        const bookingDate = parseISO(b.date);
        if (timeFilter === "today" && !isToday(bookingDate)) return false;
        if (
          timeFilter === "upcoming" &&
          !isFuture(bookingDate) &&
          !isToday(bookingDate)
        )
          return false;
        if (
          timeFilter === "past" &&
          (!isPast(bookingDate) || isToday(bookingDate))
        )
          return false;
      }
      return true;
    });
  }, [allBookings, statusFilter, barberFilter, timeFilter]);

  const handleCancelBooking = (bookingId: string) => {
    ask({
      title: "Hủy lịch hẹn này?",
      description:
        "Khung giờ sẽ được mở lại cho khách khác đặt. Bạn có thể đặt lịch mới sau.",
      confirmLabel: "Hủy lịch",
      cancelLabel: "Giữ lịch",
      destructive: true,
      onConfirm: () => performCancelBooking(bookingId),
    });
  };

  const performCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await setBookingStatus(bookingId, "cancelled");
      toast.success(
        "Đã hủy lịch hẹn thành công. Khung giờ này đã được mở lại.",
      );
      await reload();
    } catch (err) {
      reportError(err, "Không hủy được lịch hẹn. Vui lòng thử lại.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setBarberFilter("all");
    setTimeFilter("all");
    toast.info("Đã đặt lại các bộ lọc");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Lịch Hẹn Cắt Tóc Của Bạn
            </h1>
            <p className="text-xs text-slate-400">
              Danh sách lịch hẹn được đồng bộ tự động từ tài khoản của quý khách
            </p>
          </div>

          <Button variant="gold" size="sm" asChild className="text-xs">
            <Link href="/customer/booking">
              <Plus className="h-4 w-4 mr-1" />
              Đặt thêm lịch mới
            </Link>
          </Button>
        </div>

        {user && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} role={user.role} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {user.name}
                  </span>
                  <Badge variant="gold" className="text-[10px] py-0">
                    Tài khoản đã đăng nhập
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {user.phone ? `Số điện thoại: ${user.phone} • ` : ""}
                  Email:{" "}
                  <span className="font-mono text-slate-300">{user.email}</span>
                </p>
              </div>
            </div>

            <div className="text-[11px] text-gold/80 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              ✓ Lịch hẹn được tự động liên kết với tài khoản này
            </div>
          </div>
        )}

        {/* BỘ LỌC: THỜI GIAN, THỢ, TRẠNG THÁI */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-gold" />
              Bộ Lọc Lịch Hẹn
            </span>

            {(statusFilter !== "all" ||
              barberFilter !== "all" ||
              timeFilter !== "all") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-gold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">
                Thời gian:
              </label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Tất cả thời gian" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                  <SelectItem value="all">Tất cả thời gian</SelectItem>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="upcoming">Sắp tới</SelectItem>
                  <SelectItem value="past">Đã qua</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">
                Thợ cắt tóc:
              </label>
              <Select value={barberFilter} onValueChange={setBarberFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Tất cả thợ" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                  <SelectItem value="all">Tất cả thợ</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.specialty ? ` (${b.specialty})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">
                Trạng thái:
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="pending">Chờ xác nhận</SelectItem>
                  <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                  <SelectItem value="in_progress">Đang phục vụ</SelectItem>
                  <SelectItem value="completed">Đã hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Tìm thấy{" "}
            <strong className="text-white">{filteredBookings.length}</strong>{" "}
            lịch hẹn phù hợp
          </span>
        </div>

        {loading && allBookings.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
            Đang tải lịch hẹn...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
            <Calendar className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Không tìm thấy lịch hẹn nào phù hợp
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tài khoản của bạn hiện chưa có lịch hẹn nào hoặc các bộ lọc đã ẩn
              đi kết quả.
            </p>
            <Button variant="gold" size="sm" asChild className="text-xs">
              <Link href="/customer/booking">Đặt Lịch Cắt Ngay</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b) => {
              const barber = barberById.get(b.barberId);
              const canCancel =
                b.status === "pending" || b.status === "confirmed";

              return (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {b.serviceName}
                      </span>
                      <Badge
                        variant={getStatusBadgeVariant(b.status)}
                        className="text-[10px]"
                      >
                        {getStatusLabel(b.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-gold font-mono font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {b.time} • Ngày {formatDateVN(b.date)}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <UserAvatar
                          name={barber?.name}
                          role="barber"
                          size="sm"
                        />
                        <span>
                          Thợ:{" "}
                          <strong className="text-slate-300 font-medium">
                            {barber?.name ?? "—"}
                          </strong>
                        </span>
                      </span>

                      <span className="font-mono text-ok font-semibold">
                        {formatVND(b.price)}
                      </span>
                    </div>

                    {b.notes && (
                      <p className="text-[11px] text-slate-400 italic">
                        Ghi chú: &ldquo;{b.notes}&rdquo;
                      </p>
                    )}

                    <p className="text-[10px] text-slate-500 font-mono">
                      Mã lịch hẹn: {shortBookingCode(b.id)}
                    </p>
                  </div>

                  <div>
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancellingId === b.id}
                        onClick={() => handleCancelBooking(b.id)}
                        className="h-8 px-3 text-xs border-slate-700 hover:text-bad hover:border-rose-500/50"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        {cancellingId === b.id ? "Đang hủy..." : "Hủy lịch hẹn"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
      {confirmDialog}
    </div>
  );
}
