"use client";

import { getCurrentUser } from "@/lib/auth";
import { Booking, Service, User } from "@/lib/types";
import { useRouter } from "next/router";
import { addDays, format } from "date-fns";
import { useEffect, useState } from "react";
import {
  getBookings,
  MOCK_SERVICES,
  MOCK_USERS,
  saveBookings,
} from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge, Check, Clock, Scissors } from "lucide-react";
import { Button } from "./ui/button";

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

export default function BookingWizard() {
  const router = useRouter();
  const currentUser = getCurrentUser();

  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);

  const barbers = MOCK_USERS.filter((u) => u.role === "barber");

  useEffect(() => {
    setExistingBookings(getBookings());
  }, []);

  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration_minutes,
    0,
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const handleToggleService = (service: Service) => {
    if (selectedServices.find((s) => s.id === service.id)) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const isSlotBooked = (timeSlot: string) => {
    if (!selectedBarber) return false;

    return existingBookings.some((b) => {
      if (
        b.barber_id !== selectedBarber.id ||
        b.booking_date !== selectedDate ||
        b.status === "cancelled"
      ) {
        return false;
      }

      return b.start_time === timeSlot;
    });
  };

  const handleConfirmBooking = () => {
    if (!currentUser) {
      alert("Vui lòng đang nhập để hoàn tất đặt lịch!");
      router.push("/auth/customer");
      return;
    }

    const newBooking: Booking = {
      id: "b_" + Date.now(),
      customer_id: currentUser.id,
      barber_id: selectedBarber?.id || barbers[0].id,
      service_ids: selectedServices.map((s) => s.id),
      booking_date: selectedDate,
      start_time: selectedTime,
      end_time: selectedTime, // minimize complexity
      total_price: totalPrice,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const currentBookings = getBookings();
    saveBookings([...currentBookings, newBooking]);

    alert("Đặt lịch thành công!");
    router.push("/customer/appointments");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* progress bar */}
      <div className="flex justify-between items-center border-b pb-4">
        {[
          { num: 1, title: "Chọn Dịch vụ" },
          { num: 2, title: "Chọn Thợ & Ngày" },
          { num: 3, title: "Chọn Khung Giờ" },
          { num: 4, title: "Xác nhận" },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 ${step >= s.num ? "text-primary font-bold" : "text-muted-foreground"}`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${step >= s.num ? "bg-primary text-white" : "bg-slate-200"}`}
            >
              {s.num}
            </span>

            <span className="hidden sm:inline">{s.title}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Choose Service */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 1: Chọn một hoặc nhiều dịch vụ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {MOCK_SERVICES.map((service) => {
              // check the service is selected or not
              const isSelected = selectedServices.some(
                (s) => service.id === s.id,
              );
              return (
                <div
                  key={service.id}
                  onClick={() => handleToggleService(service)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all flex justify-between items-start ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:border-slate-300"}`}
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {service.duration_minutes} phút
                      </span>

                      <span className="font-bold text-primary">
                        {service.price.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Badge className="bg-primary">
                      <Check className="w-3 h-3" />
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Choose Barber and Date */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 2: Chọn thợ cắt tóc và ngày hẹn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-3 block">
                Chọn thợ:
              </label>
              <div className="grid grid-cols-2 gap-4">
                {barbers.map((barber) => (
                  <div
                    key={barber.id}
                    onClick={() => setSelectedBarber(barber)}
                    className={`p-4 border rounded-lg cursor-pointer flex items-center gap-3 ${selectedBarber?.id === barber.id ? "border-primary bg-primary/5" : "hover:border-slate-300"}`}
                  >
                    <Scissors className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">{barber.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Thợ cắt chính
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">
                Chọn ngày:
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                  const date = addDays(new Date(), offset);
                  const dateStr = format(date, "DD-MM-yyyy");
                  const isSelected = selectedDate === dateStr;
                  return (
                    <Button
                      key={dateStr}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className="flex-col h-auto py-3 px-4 min-w-22.5"
                      onClick={() => setSelectedDate(dateStr)}
                    >
                      <span className="text-xs">{format(date, "EEE")}</span>
                      <span className="text-lg font-bold">
                        {format(date, "dd/MM")}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Time Grid */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 3: Chọn khung giờ hẹn</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              * Ô màu xanh là giờ còn trống. Ô màu xám gạch ngang là giờ đã có
              khách đặt.
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
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
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm Information */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 4: Xác nhận thông tin lịch hẹn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
              <p>
                <strong>Thợ phục vụ:</strong> {selectedBarber?.full_name}
              </p>
              <p>
                <strong>Thời gian:</strong> {selectedTime} - Ngày {selectedDate}
              </p>
              <p>
                <strong>Tổng thời gian dự kiến:</strong> {totalDuration} phút
              </p>
              <p>
                <strong>Các dịch vụ:</strong>{" "}
                {selectedServices.map((s) => s.name).join(", ")}
              </p>
              <hr />
              <p className="text-base font-bold text-primary">
                Tổng chi phí: {totalPrice.toLocaleString("vi-VN")} đ
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Navigation */}
      <div className="flex justify-between items-center pt-4">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Quay lại
          </Button>
        )}
        <div className="ml-auto">
          {step < 4 ? (
            <Button
              disabled={
                (step === 1 && selectedServices.length === 0) ||
                (step === 2 && (!selectedBarber || !selectedDate)) ||
                (step === 3 && !selectedTime)
              }
              onClick={() => setStep(step + 1)}
            >
              Tiếp theo
            </Button>
          ) : (
            <Button
              onClick={handleConfirmBooking}
              className="bg-green-600 hover:bg-green-700"
            >
              Xác nhận đặt lịch
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
