import React from "react";
import Link from "next/link";
import { Scissors, Clock, MapPin, Phone, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cột 1: Thông tin tiệm */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-neutral-950 font-bold">
                <Scissors className="h-4 w-4 -rotate-45" />
              </div>
              <span className="text-sm font-bold tracking-wider text-white uppercase">
                Vanguard &amp; Blade
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Tiệm tóc quý ông cao cấp với kỹ thuật cắt kéo và cạo mặt truyền thống.
              Trải nghiệm thư giãn chỉn chu trong từng phút giây.
            </p>
            <div className="flex items-center gap-1.5 text-gold text-[11px]">
              <ShieldCheck className="h-4 w-4" />
              <span>Cam kết 100% hài lòng sau khi cắt</span>
            </div>
          </div>

          {/* Cột 2: Giờ mở cửa */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <Clock className="h-3.5 w-3.5 text-gold" />
              <span>Giờ Phục Vụ</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li className="flex justify-between">
                <span>Thứ 2 – Thứ 6:</span>
                <span className="text-slate-200">08:30 – 20:30</span>
              </li>
              <li className="flex justify-between">
                <span>Thứ 7 &amp; Chủ Nhật:</span>
                <span className="text-slate-200">08:00 – 21:00</span>
              </li>
            </ul>
          </div>

          {/* Cột 3: Địa chỉ liên hệ & Đặt lịch */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <MapPin className="h-3.5 w-3.5 text-gold" />
              <span>Địa Chỉ &amp; Liên Hệ</span>
            </div>
            <div className="space-y-1 text-slate-400 text-[11px]">
              <p>Số 88 Phố Huế, Quận Hai Bà Trưng, Hà Nội</p>
              <p className="flex items-center gap-1 text-slate-200 pt-1">
                <Phone className="h-3 w-3 text-gold" />
                Hotline đặt lịch: 0901 888 999
              </p>
              <div className="pt-2">
                <Link
                  href="/customer/booking"
                  className="text-gold hover:underline font-semibold"
                >
                  &rarr; Đặt lịch cắt tóc trực tuyến
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>&copy; {new Date().getFullYear()} Tiệm Tóc Quý Ông Vanguard &amp; Blade. Bảo lưu mọi quyền.</p>
          <p>Hệ thống đặt lịch trực tuyến vận hành trên Supabase</p>
        </div>
      </div>
    </footer>
  );
}
