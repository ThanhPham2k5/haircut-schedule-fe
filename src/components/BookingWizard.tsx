"use client";

import { getCurrentUser } from "@/lib/auth";
import { Booking, Service, User } from "@/lib/types";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import {
  getBookings,
  MOCK_SERVICES,
  MOCK_USERS,
  saveBookings,
} from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge, Check, Clock } from "lucide-react";

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
              const isSelected = selectedServices.some(
                (s) => s.id === service.id,
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
    </div>
  );
}
