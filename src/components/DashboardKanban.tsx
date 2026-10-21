"use client";

import { getBookings, MOCK_USERS } from "@/lib/mockData";
import { getStatusBadgeInfo } from "@/lib/statusHelper";
import { Booking } from "@/lib/types";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Scissors, UserIcon } from "lucide-react";
import EditBookingModal from "./EditBookingModal";

export default function DashboardKanban() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const fetchBookings = () => {
    setBookings(getBookings());
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const columns: { id: Booking["status"]; title: string }[] = [
    { id: "pending", title: "Chờ xác nhận" },
    { id: "confirmed", title: "Đã xác nhận" },
    { id: "completed", title: "Hoàn thành" },
    { id: "cancelled", title: "Đã hủy" },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colBookings = bookings.filter((b) => b.status === col.id);
          const badgeInfo = getStatusBadgeInfo(col.id);

          return (
            <div key={col.id} className="bg-slate-50/50 p-4 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-slate-700">
                  {col.title}
                </h3>

                <Badge variant="secondary" className="rounded-full">
                  {colBookings.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {colBookings.map((booking) => {
                  const customer = MOCK_USERS.find(
                    (u) => u.id === booking.customer_id,
                  );
                  const barber = MOCK_USERS.find(
                    (u) => u.id === booking.barber_id,
                  );

                  return (
                    <Card
                      key={booking.id}
                      className="cursor-pointer hover:border-primary transition-colors shadow-sm"
                      onClick={() => setEditingBooking(booking)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                            {booking.start_time}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {booking.booking_date}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            {customer?.full_name || "Khách"}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Scissors className="w-3 h-3" />
                            {barber?.full_name}
                          </div>
                        </div>

                        <Badge
                          className={`w-full justify-center text-xs ${badgeInfo.className}`}
                          variant={badgeInfo.variant}
                        >
                          {badgeInfo.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}

                {colBookings.length === 0 && (
                  <div className="text-center p-4 border-2 border-dashed rounded-lg text-slate-400 text-xs">
                    Không có lịch hẹn
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Modal */}
      <EditBookingModal
        isOpen={!!editingBooking}
        booking={editingBooking}
        onClose={() => setEditingBooking(null)}
        onSaved={fetchBookings} // refreshing board after saving
      />
    </div>
  );
}
