import Link from "next/link";
import { Compass, Home, CalendarPlus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
            <Compass className="h-8 w-8 text-gold" />
          </div>

          <div className="space-y-2">
            <p className="font-mono text-xs text-gold tracking-widest">LỖI 404</p>
            <h1 className="text-2xl font-bold text-white text-balance">Không tìm thấy trang này</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Đường dẫn có thể đã thay đổi hoặc bị gõ sai. Bạn quay lại trang chủ hoặc đặt lịch cắt tóc nhé.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" asChild className="w-full sm:w-auto border-slate-700">
              <Link href="/">
                <Home className="h-4 w-4 mr-1.5" />
                Về trang chủ
              </Link>
            </Button>
            <Button variant="gold" asChild className="w-full sm:w-auto">
              <Link href="/customer/booking">
                <CalendarPlus className="h-4 w-4 mr-1.5" />
                Đặt lịch ngay
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
