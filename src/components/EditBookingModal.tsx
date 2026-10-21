"use client";

import { getBookings, MOCK_USERS, saveBookings } from "@/lib/mockData";
import { Booking } from "@/lib/types";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { addDays, format } from "date-fns";
import { Button } from "./ui/button";

interface EditBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
];

export default function EditBookingModal({
  booking,
  isOpen,
  onClose,
  onSaved,
}: EditBookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedBarberId, setSelectedBarberId] = useState<string>("");
  const [status, setStatus] = useState<Booking["status"]>("pending");

  const barbers = MOCK_USERS.filter((u) => u.role === "barber");

  // initialize data from booking
  useEffect(() => {
    if (booking && isOpen) {
      setSelectedDate(booking.booking_date);
      setSelectedTime(booking.start_time);
      setSelectedBarberId(booking.barber_id);
      setStatus(booking.status);
    }
  }, [booking, isOpen]);

  const isSlotBooked = (timeSlot: string) => {
    const allBookings = getBookings();
    return allBookings.some((b) => {
      // skip the booking that we are handling
      if (booking && b.id === booking.id) return false;

      // skip the booking if the barber or date is diff or it was cancelled
      if (
        b.barber_id !== selectedBarberId ||
        b.booking_date !== selectedDate ||
        b.status === "cancelled"
      )
        return false;

      return b.start_time === timeSlot;
    });
  };

  const handleSave = () => {
    if (!booking) return;

    const allBookings = getBookings();
    const updatedBookings = allBookings.map((b) => {
      if (b.id === booking.id) {
        return {
          ...b,
          booking_date: selectedDate,
          start_time: selectedTime,
          end_time: selectedTime,
          barber_id: selectedBarberId,
          status: status,
        };
      }

      return b;
    });

    saveBookings(updatedBookings);
    onSaved(); // call back to refresh the booking list
    onClose(); // call back to close the modal
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Cập nhật lịch hẹn #{booking.id.replace("b_", "")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Choose Barber */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Thợ cắt tóc</label>
              <Select
                value={selectedBarberId}
                onValueChange={(val) => {
                  if (val) setSelectedBarberId(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thợ" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái đơn</label>
              <Select
                value={status}
                onValueChange={(val) => {
                  if (val) setStatus(val as Booking["status"]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="pending">Chờ xác nhận</SelectItem>
                  <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                  <SelectItem value="completed">Đã hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã huỷ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Choose Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ngày phục vụ</label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                const date = addDays(new Date(), offset);
                const dateStr = format(date, "yyyy-MM-dd");
                const isSelected = selectedDate === dateStr;
                return (
                  <Button
                    key={dateStr}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className="flex-col h-auto py-2 px-3 min-w-20"
                    onClick={() => setSelectedDate(dateStr)}
                  >
                    <span className="text-xs">{format(date, "EEE")}</span>
                    <span className="text-sm font-bold">
                      {format(date, "dd/MM")}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Time Grid */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Khung giờ hẹn</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {TIME_SLOTS.map((time) => {
                const booked = isSlotBooked(time);
                const isSelected = selectedTime === time;

                return (
                  <Button
                    key={time}
                    disabled={booked}
                    variant={
                      isSelected ? "default" : booked ? "ghost" : "outline"
                    }
                    className={`w-full ${booked ? "line-through bg-slate-100 text-slate-400" : isSelected ? "bg-primary" : "hover:border-primary text-primary"}`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={handleSave}>Lưu thay đổi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
