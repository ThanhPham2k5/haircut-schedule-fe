"use client";

import React, { useState, useMemo, useCallback } from "react";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { Calendar, Clock, Check, Play, CheckCircle2, XCircle, Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthGuard } from "@/components/AuthGuard";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchBookings, setBookingStatus } from "@/lib/data";
import { formatVND, formatDateVN, getWeekdayVN, toDateKey } from "@/lib/format";
import { ALL_TIME_SLOTS, timeToMinutes } from "@/lib/slots";
import { getStatusLabel, getStatusBadgeVariant } from "@/lib/statusHelper";
import { reportError } from "@/lib/errors";
import { useAsyncData } from "@/hooks/use-async-data";
import { useAuth } from "@/providers/auth-provider";
import type { BookingStatus } from "@/lib/types";

export default function BarberSchedulePage() {
  return (
    <AuthGuard allowedRoles={["barber"]} pageTitle="Ca làm việc của thợ">
      <ScheduleContent />
    </AuthGuard>
  );
}

function ScheduleContent() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));
  const [busyId, setBusyId] = useState<string | null>(null);

  // RLS chỉ trả về lịch hẹn của chính thợ đang đăng nhập
  const loadBookings = useCallback(() => fetchBookings(), []);
  const {
    data: bookings = [],
    loading,
    reload,
  } = useAsyncData(loadBookings, { errorMessage: "Không tải được lịch làm việc." });

  const dayBookings = useMemo(
    () => bookings.filter((b) => b.date === selectedDate && b.status !== "cancelled"),
    [bookings, selectedDate]
  );

  // Thống kê nhanh trong ngày của thợ
  const stats = useMemo(() => {
    const completed = dayBookings.filter((b) => b.status === "completed").length;
    const waiting = dayBookings.filter((b) => b.status === "confirmed" || b.status === "pending").length;
    const totalRev = dayBookings.reduce((sum, b) => sum + b.price, 0);
    return { total: dayBookings.length, completed, waiting, totalRev };
  }, [dayBookings]);

  // Các mốc giờ hiển thị: lưới chuẩn + giờ của các lịch không nằm trên lưới
  const timeRows = useMemo(() => {
    const set = new Set<string>(ALL_TIME_SLOTS);
    dayBookings.forEach((b) => set.add(b.time));
    return Array.from(set).sort();
  }, [dayBookings]);

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    setBusyId(bookingId);
    try {
      await setBookingStatus(bookingId, status);
      toast.success(`Đã chuyển trạng thái: ${getStatusLabel(status)}`);
      await reload();
    } catch (err) {
      reportError(err, "Không cập nhật được trạng thái.");
    } finally {
      setBusyId(null);
    }
  };

  const today = new Date();
  const tomorrow = addDays(today, 1);

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Hồ sơ thợ */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex items-center gap-4">
          <UserAvatar name={user?.name} role="barber" size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{user?.name}</h1>
              <Badge variant="gold" className="text-[10px]">
                Master Barber
              </Badge>
            </div>
            {user?.specialty && <p className="text-xs text-gold font-medium">{user.specialty}</p>}
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              {user?.rating != null && (
                <>
                  <span className="flex items-center gap-1 text-slate-200">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-gold" />
                    {user.rating} ({user.reviewCount ?? 0} lượt đánh giá)
                  </span>
                  <span>•</span>
                </>
              )}
              <span>SĐT: {user?.phone}</span>
            </div>
          </div>
        </div>

        {/* THỐNG KÊ CA CỦA THỢ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Tổng số khách ca này</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {stats.total} <span className="text-xs text-slate-500 font-normal">lượt</span>
            </span>
          </div>
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Đã hoàn thành</span>
            <span className="text-2xl font-bold text-info mt-1 block">
              {stats.completed} <span className="text-xs text-slate-500 font-normal">khách</span>
            </span>
          </div>
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Chờ phục vụ</span>
            <span className="text-2xl font-bold text-gold mt-1 block">
              {stats.waiting} <span className="text-xs text-slate-500 font-normal">khách</span>
            </span>
          </div>
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block font-medium">Doanh thu ca làm</span>
            <span className="text-xl font-bold text-ok font-mono mt-1 block">{formatVND(stats.totalRev)}</span>
          </div>
        </div>

        {/* BỘ LỌC NGÀY CA LÀM VIỆC */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gold" />
            <span className="text-xs font-bold text-white">Xem ca ngày:</span>
            <div className="flex items-center gap-1.5">
              <Button
                variant={selectedDate === toDateKey(today) ? "gold" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(toDateKey(today))}
                className="h-7 text-xs px-2.5"
              >
                Hôm nay ({getWeekdayVN(today)})
              </Button>
              <Button
                variant={selectedDate === toDateKey(tomorrow) ? "gold" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(toDateKey(tomorrow))}
                className="h-7 text-xs px-2.5"
              >
                Ngày mai ({getWeekdayVN(tomorrow)})
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Chọn ngày khác:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs px-2.5 py-1 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs text-gold font-mono hidden sm:inline">({formatDateVN(selectedDate)})</span>
          </div>
        </div>

        {/* LỊCH CA LÀM VIỆC THEO GIỜ */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold" />
            Bảng Ca Làm Việc Chi Tiết Theo Từng Khung Giờ (Ngày {formatDateVN(selectedDate)})
          </h2>

          {loading && bookings.length === 0 && (
            <p className="text-xs text-slate-500">Đang tải ca làm việc...</p>
          )}

          <div className="space-y-3">
            {timeRows.map((time) => {
              const booking = dayBookings.find((b) => b.time === time);
              // Khung giờ nằm giữa một ca dài hơn 1 tiếng (ví dụ ca 75 phút bắt đầu 10:30 phủ luôn 11:30)
              const covering = booking
                ? undefined
                : dayBookings.find(
                    (b) => timeToMinutes(time) > timeToMinutes(b.time) && timeToMinutes(time) < timeToMinutes(b.endTime)
                  );
              const working = busyId === booking?.id;

              return (
                <div
                  key={time}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    booking
                      ? booking.status === "in_progress"
                        ? "bg-slate-900 border-cyan-500/60 ring-1 ring-cyan-500/30"
                        : booking.status === "completed"
                        ? "bg-slate-950/60 border-slate-800/60 opacity-80"
                        : "bg-slate-900 border-slate-800"
                      : "bg-slate-950/40 border-dashed border-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 md:w-36 shrink-0">
                    <span
                      className={`h-8 w-16 flex items-center justify-center rounded-lg text-xs font-mono font-bold ${
                        booking
                          ? "bg-amber-500/15 text-gold border border-amber-500/40"
                          : "bg-slate-950 text-slate-500 border border-slate-800"
                      }`}
                    >
                      {time}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {booking ? `${booking.durationMinutes}p` : covering ? "Đang bận" : "Trống"}
                    </span>
                  </div>

                  <div className="flex-1">
                    {booking ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm">{booking.customerName}</span>
                          <span className="text-xs text-slate-400">({booking.customerPhone})</span>
                          <Badge variant={getStatusBadgeVariant(booking.status)} className="text-[10px]">
                            {getStatusLabel(booking.status)}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span className="text-slate-200 font-medium">{booking.serviceName}</span>
                          <span>•</span>
                          <span className="font-mono text-gold font-bold">{formatVND(booking.price)}</span>
                          <span>•</span>
                          <span className="font-mono">
                            {booking.time}–{booking.endTime}
                          </span>
                        </div>

                        {booking.notes && (
                          <p className="text-[11px] text-gold/80 italic">Yêu cầu khách: &ldquo;{booking.notes}&rdquo;</p>
                        )}
                      </div>
                    ) : covering ? (
                      <span className="text-xs text-slate-500 italic">
                        Đang trong ca của {covering.customerName} (đến {covering.endTime})
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Chưa có khách đặt trong khung giờ này</span>
                    )}
                  </div>

                  {booking && (
                    <div className="flex items-center gap-1.5 self-end md:self-center">
                      {booking.status === "pending" && (
                        <Button
                          size="sm"
                          variant="emerald"
                          disabled={working}
                          onClick={() => handleUpdateStatus(booking.id, "confirmed")}
                          className="h-7 px-2.5 text-xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Nhận ca
                        </Button>
                      )}

                      {booking.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="gold"
                          disabled={working}
                          onClick={() => handleUpdateStatus(booking.id, "in_progress")}
                          className="h-7 px-2.5 text-xs"
                        >
                          <Play className="h-3.5 w-3.5 mr-1" />
                          Bắt đầu cắt
                        </Button>
                      )}

                      {booking.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={working}
                          onClick={() => handleUpdateStatus(booking.id, "completed")}
                          className="h-7 px-2.5 text-xs bg-emerald-600 text-[#fff] hover:bg-emerald-500"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Cắt xong
                        </Button>
                      )}

                      {booking.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={working}
                          onClick={() => {
                            if (confirm("Khách không đến / hủy ca này?")) {
                              void handleUpdateStatus(booking.id, "cancelled");
                            }
                          }}
                          className="h-7 px-2 text-xs text-slate-500 hover:text-bad"
                          title="Khách không đến / Hủy ca"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
