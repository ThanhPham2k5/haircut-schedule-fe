"use client";

import React, { useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  Calendar,
  Star,
  Clock,
  Sparkles,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { fetchBarbers, fetchServices } from "@/lib/data";
import { formatVND } from "@/lib/format";
import { useAsyncData } from "@/hooks/use-async-data";
import { useAuth } from "@/providers/auth-provider";
import { UserAvatar } from "@/components/UserAvatar";
import Link from "next/link";

/** Số lượng xem trước trên trang chủ, phần còn lại xem ở trang đặt lịch */
const SERVICE_PREVIEW = 6;
const BARBER_PREVIEW = 3;

export default function HomePage() {
  const { user } = useAuth();
  const loadServices = useCallback(
    () => fetchServices({ activeOnly: true }),
    [],
  );
  const loadBarbers = useCallback(() => fetchBarbers({ activeOnly: true }), []);
  const { data: services = [], loading: servicesLoading } = useAsyncData(
    loadServices,
    {
      errorMessage: "Không tải được bảng giá dịch vụ.",
    },
  );
  const { data: barbers = [], loading: barbersLoading } = useAsyncData(
    loadBarbers,
    {
      errorMessage: "Không tải được danh sách thợ.",
    },
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <Navbar />

      <main className="flex-1 space-y-16 py-12 md:py-20">
        {/* HERO SECTION TINH GIẢN */}
        <section className="max-w-4xl mx-auto px-4 text-center space-y-5">
          <Badge variant="gold">Tiệm Tóc Quý Ông Cao Cấp</Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white uppercase font-sans">
            Nghệ Thuật Cắt Tóc <br />
            <span className="text-gold">Chuẩn Quý Ông Hiện Đại</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Không gian thư giãn đẳng cấp, kỹ thuật cắt kéo thủ công chuẩn xác
            từng đường nét và quy trình đặt lịch nhanh chóng, không phải chờ
            đợi.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="gold"
              size="lg"
              asChild
              className="gap-2 text-xs font-semibold px-6"
            >
              <Link href="/customer/booking">
                <Calendar className="h-4 w-4" />
                Đặt Lịch Hẹn Cắt Tóc
              </Link>
            </Button>

            {user?.role === "customer" && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="text-xs border-slate-700 px-6"
              >
                <Link href="/customer/appointments">Xem Lịch Hẹn Của Tôi</Link>
              </Button>
            )}
          </div>

          {/* 3 Cam kết cốt lõi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 border-t border-slate-800/80 max-w-2xl mx-auto text-left">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-gold shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white text-xs block">
                  Không phải đợi
                </span>
                <span className="text-[11px] text-slate-400">
                  Đúng giờ, đúng ghế, phục vụ riêng
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Scissors className="h-5 w-5 text-gold shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white text-xs block">
                  Master Barber
                </span>
                <span className="text-[11px] text-slate-400">
                  Thợ lành nghề từ 5-12 năm kinh nghiệm
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Sparkles className="h-5 w-5 text-gold shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white text-xs block">
                  Bảo hành kiểu tóc
                </span>
                <span className="text-[11px] text-slate-400">
                  Chỉnh sửa miễn phí trong 3 ngày
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* BẢNG GIÁ DỊCH VỤ NIÊM YẾT */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Bảng Giá Dịch Vụ Cắt &amp; Chăm Sóc Tóc
              </h2>
              <p className="text-xs text-slate-400">
                Giá niêm yết minh bạch, cam kết không phụ thu
              </p>
            </div>

            <Button variant="gold" size="sm" asChild className="text-xs">
              <Link href="/customer/booking">Đặt Lịch Ngay</Link>
            </Button>
          </div>

          {servicesLoading && (
            <p className="text-xs text-slate-500 text-center py-6">
              Đang tải bảng giá...
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {services.slice(0, SERVICE_PREVIEW).map((srv) => (
              <div
                key={srv.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-white text-xs">{srv.name}</h3>
                  <span className="text-xs font-mono font-bold text-gold">
                    {formatVND(srv.price)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {srv.description}
                </p>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                  Thời lượng: {srv.durationMinutes} phút
                </div>
              </div>
            ))}
          </div>
          {services.length > SERVICE_PREVIEW && (
            <div className="text-center mt-5">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs border-slate-700"
              >
                <Link href="/customer/booking">
                  Xem tất cả {services.length} dịch vụ
                </Link>
              </Button>
            </div>
          )}
        </section>

        {/* ĐỘI NGŨ MASTER BARBER */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-white">
              Đội Ngũ Thợ Cắt Tóc
            </h2>
            <p className="text-xs text-slate-400">
              Các tay kéo lành nghề, tận tâm phục vụ quý ông
            </p>
          </div>

          {barbersLoading && (
            <p className="text-xs text-slate-500 text-center py-6">
              Đang tải danh sách thợ...
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {barbers.slice(0, BARBER_PREVIEW).map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2"
              >
                <div className="flex justify-center">
                  <UserAvatar name={b.name} role="barber" size="xl" />
                </div>
                <h3 className="font-bold text-white text-xs">{b.name}</h3>
                <p className="text-[11px] text-gold font-medium">
                  {b.specialty}
                </p>
                {b.rating != null && (
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-300">
                    <Star className="h-3 w-3 fill-amber-400 text-gold" />
                    <span>
                      {b.rating} ({b.reviewCount ?? 0} đánh giá)
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {barbers.length > BARBER_PREVIEW && (
            <div className="text-center mt-5">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs border-slate-700"
              >
                <Link href="/customer/booking">
                  Xem tất cả {barbers.length} thợ
                </Link>
              </Button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
