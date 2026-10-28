"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/FieldError";
import type { Booking, BookingStatus, Service, User } from "@/lib/types";
import {
  adminUpdateBooking,
  fetchBarberBusy,
  fetchBarberSchedule,
} from "@/lib/data";
import { formatVND, formatDateVN, shortBookingCode } from "@/lib/format";
import { ALL_TIME_SLOTS, computeSlots, slotReasonLabel } from "@/lib/slots";
import { getStatusLabel, getStatusBadgeVariant } from "@/lib/statusHelper";
import { adminBookingEditSchema } from "@/lib/schemas";
import { validate, type FieldErrors } from "@/lib/validation";
import { reportError } from "@/lib/errors";
import { useAsyncData } from "@/hooks/use-async-data";
import { toast } from "sonner";
import { Clock, Scissors, AlertCircle, Check } from "lucide-react";

interface EditBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  barbers: User[];
  services: Service[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditBookingModal({
  booking,
  isOpen,
  barbers,
  services,
  onClose,
  onSuccess,
}: EditBookingModalProps) {
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<BookingStatus>("pending");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setServiceIds(booking.services.map((s) => s.serviceId));
    setSelectedBarberId(booking.barberId);
    setSelectedDate(booking.date);
    setSelectedTime(booking.time);
    setSelectedStatus(booking.status);
    setNotes(booking.notes ?? "");
    setErrors({});
  }, [booking]);

  // Dịch vụ đã có trong phiếu có thể đã bị ngưng bán → vẫn hiển thị để giữ nguyên
  const serviceOptions = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; price: number; durationMinutes: number }
    >();
    services.forEach((s) => {
      if (s.isActive) map.set(s.id, s);
    });
    booking?.services.forEach((bs) => {
      if (!map.has(bs.serviceId)) {
        const full = services.find((s) => s.id === bs.serviceId);
        map.set(bs.serviceId, {
          id: bs.serviceId,
          name: bs.name,
          price: bs.priceAtBooking,
          durationMinutes: full?.durationMinutes ?? 30,
        });
      }
    });
    return Array.from(map.values());
  }, [services, booking]);

  const totalDuration = useMemo(() => {
    const picked = serviceOptions.filter((s) => serviceIds.includes(s.id));
    return (
      picked.reduce((sum, s) => sum + s.durationMinutes, 0) ||
      booking?.durationMinutes ||
      30
    );
  }, [serviceOptions, serviceIds, booking]);

  const totalPrice = useMemo(
    () =>
      serviceOptions
        .filter((s) => serviceIds.includes(s.id))
        .reduce((sum, s) => sum + s.price, 0),
    [serviceOptions, serviceIds],
  );

  const ready = isOpen && !!booking && !!selectedBarberId && !!selectedDate;

  const loadSchedule = useCallback(
    () => fetchBarberSchedule(selectedBarberId),
    [selectedBarberId],
  );
  const { data: schedule } = useAsyncData(loadSchedule, {
    enabled: ready,
    errorMessage: "Không tải được lịch làm việc của thợ.",
  });

  const loadBusy = useCallback(
    () => fetchBarberBusy(selectedBarberId, selectedDate, booking?.id),
    [selectedBarberId, selectedDate, booking?.id],
  );
  const { data: busy, loading: busyLoading } = useAsyncData(loadBusy, {
    enabled: ready,
    errorMessage: "Không tải được các khung giờ đã có khách.",
  });

  const slots = useMemo(() => {
    if (!schedule || !busy || !selectedDate) return [];
    const dow = new Date(`${selectedDate}T00:00:00`).getDay();
    const day = schedule.find((d) => d.dayOfWeek === dow) ?? null;
    const candidates = Array.from(
      new Set([...ALL_TIME_SLOTS, ...(booking ? [booking.time] : [])]),
    ).sort();
    const input = {
      date: selectedDate,
      durationMinutes: totalDuration,
      schedule: day,
      busy,
      candidates,
    };

    // Giờ hiện tại thật: khung giờ đã qua không được chọn, giống trang khách
    const real = computeSlots({ ...input });
    // Lịch cũ đã qua giờ vẫn được giữ đúng khung gốc (để admin đổi trạng thái / sửa ghi chú)
    const isOriginal = (time: string) =>
      booking?.date === selectedDate && booking?.time === time;
    if (!real.some((s) => s.reason === "past" && isOriginal(s.time)))
      return real;
    const relaxed = computeSlots({ ...input, now: new Date(0) });
    return real.map((s, i) =>
      s.reason === "past" && isOriginal(s.time) ? relaxed[i] : s,
    );
  }, [schedule, busy, selectedDate, totalDuration, booking]);

  const currentSlot = slots.find((s) => s.time === selectedTime);
  const isCurrentTimeAvailable = !!currentSlot?.available;
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);

  const toggleService = (id: string) =>
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    const result = validate(adminBookingEditSchema, {
      serviceId: serviceIds[0] ?? "",
      barberId: selectedBarberId,
      date: selectedDate,
      time: selectedTime,
      status: selectedStatus,
      notes,
    });
    setErrors(result.errors);
    if (!result.success) {
      toast.error(result.firstError);
      return;
    }
    if (serviceIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một dịch vụ");
      return;
    }
    if (!isCurrentTimeAvailable) {
      toast.error(
        "Khung giờ này không khả dụng! Vui lòng chọn khung giờ còn trống.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await adminUpdateBooking({
        bookingId: booking.id,
        barberId: result.data.barberId,
        date: result.data.date,
        time: result.data.time,
        serviceIds,
        status: result.data.status,
        notes: result.data.notes,
      });
      toast.success("Cập nhật lịch hẹn thành công!", {
        description: `Mã lịch hẹn: ${shortBookingCode(booking.id)} của khách ${booking.customerName}.`,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      reportError(err, "Không thể cập nhật lịch hẹn.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-gold border border-amber-500/30">
                <Scissors className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Chỉnh Sửa Thông Tin Lịch Hẹn
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Mã phiếu:{" "}
                  <span className="font-mono text-slate-300">
                    {shortBookingCode(booking.id)}
                  </span>
                </DialogDescription>
              </div>
            </div>
            <Badge variant={getStatusBadgeVariant(selectedStatus)}>
              {getStatusLabel(selectedStatus)}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Thông tin khách (chỉ xem - lấy từ tài khoản khách) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Khách hàng</span>
              <span className="text-white font-semibold">
                {booking.customerName}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Số điện thoại</span>
              <span className="text-slate-200">{booking.customerPhone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Email</span>
              <span className="text-slate-200 break-all">
                {booking.customerEmail}
              </span>
            </div>
          </div>

          {/* Dịch vụ */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">
              Gói dịch vụ (chọn một hoặc nhiều) — {totalDuration} phút •{" "}
              {formatVND(totalPrice)}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {serviceOptions.map((srv) => {
                const on = serviceIds.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                      on
                        ? "border-amber-400 bg-amber-500/10 text-white"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <span>
                      {srv.name}
                      <span className="block text-[10px] text-slate-500">
                        {formatVND(srv.price)} • {srv.durationMinutes}p
                      </span>
                    </span>
                    {on && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.serviceId} />
          </div>

          {/* Trạng thái, thợ, ngày */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Trạng thái</Label>
              <Select
                value={selectedStatus}
                onValueChange={(v) => setSelectedStatus(v as BookingStatus)}
              >
                <SelectTrigger className="h-9 text-xs bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="text-xs text-gold">
                    Chờ xác nhận
                  </SelectItem>
                  <SelectItem value="confirmed" className="text-xs text-ok">
                    Đã xác nhận
                  </SelectItem>
                  <SelectItem value="in_progress" className="text-xs text-live">
                    Đang phục vụ
                  </SelectItem>
                  <SelectItem value="completed" className="text-xs text-info">
                    Đã hoàn thành
                  </SelectItem>
                  <SelectItem value="cancelled" className="text-xs text-bad">
                    Đã hủy
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Thợ phụ trách</Label>
              <Select
                value={selectedBarberId}
                onValueChange={setSelectedBarberId}
              >
                <SelectTrigger className="h-9 text-xs bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Chọn thợ" />
                </SelectTrigger>
                <SelectContent>
                  {barbers
                    .filter((b) => !b.isLocked || b.id === booking.barberId)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.barberId} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300">Ngày hẹn</Label>
                <span className="text-[11px] text-gold font-mono">
                  ({formatDateVN(selectedDate)})
                </span>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 text-xs bg-slate-800 border-slate-700"
              />
              <FieldError message={errors.date} />
            </div>
          </div>

          {/* Khung giờ tính động theo ca làm + lịch đã đặt */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs text-slate-300 flex items-center gap-1.5 font-bold">
                <Clock className="h-3.5 w-3.5 text-gold" />
                Khung giờ khả dụng ({selectedBarber?.name} •{" "}
                {formatDateVN(selectedDate)})
              </Label>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Trống
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-600" />
                  Không khả dụng
                </span>
              </div>
            </div>

            {selectedTime && slots.length > 0 && !isCurrentTimeAvailable && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-bad text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Khung giờ <strong>{selectedTime}</strong> không khả dụng (
                  {slotReasonLabel(currentSlot?.reason)}). Vui lòng chọn khung
                  giờ trống khác.
                </span>
              </div>
            )}
            <FieldError message={errors.time} />

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 min-h-16">
              {busyLoading && slots.length === 0 && (
                <span className="col-span-full text-xs text-slate-500">
                  Đang tính khung giờ...
                </span>
              )}
              {slots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`py-2 px-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      isSelected
                        ? "bg-amber-500 text-neutral-950 font-bold shadow-md ring-2 ring-amber-400"
                        : slot.available
                          ? "bg-slate-900 border border-emerald-500/30 text-ok hover:bg-emerald-500/20 cursor-pointer"
                          : "bg-slate-950 border border-slate-800 text-slate-600 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <span>{slot.time}</span>
                    <span className="block text-[8px] font-sans">
                      {isSelected
                        ? "Đã chọn"
                        : slot.available
                          ? "Trống"
                          : slotReasonLabel(slot.reason)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Ghi chú</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Yêu cầu kiểu tóc, lưu ý da mặt..."
              className="h-8 text-xs bg-slate-800 border-slate-700"
            />
            <FieldError message={errors.notes} />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-700 text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={isSubmitting || !isCurrentTimeAvailable}
              className="text-xs font-semibold"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu Thay Đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
