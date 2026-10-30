"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { FadeUp } from "@/components/FadeUp";
import { Pagination, usePagination } from "@/components/Pagination";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceCategory } from "@/lib/types";
import { FieldError, errorRing } from "@/components/FieldError";
import {
  fetchServices,
  fetchBarbers,
  fetchBarberSchedule,
  fetchBarberBusy,
  createBooking,
} from "@/lib/data";
import {
  formatVND,
  formatDateVN,
  getWeekdayVN,
  shortBookingCode,
  toDateKey,
} from "@/lib/format";
import { computeSlots, slotReasonLabel } from "@/lib/slots";
import { bookingRequestSchema } from "@/lib/schemas";
import { validateWithToast, type FieldErrors } from "@/lib/validation";
import { reportError } from "@/lib/errors";
import { useAsyncData } from "@/hooks/use-async-data";
import { useAuth } from "@/providers/auth-provider";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Search,
} from "lucide-react";
import Link from "next/link";

interface CreatedBooking {
  id: string;
  date: string;
  time: string;
  price: number;
  barberName: string;
}

/** Bỏ dấu tiếng Việt và viết thường để tìm kiếm "cat toc" vẫn khớp "Cắt tóc" */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

type ServiceSort = "popular" | "price-asc" | "price-desc" | "duration";
type BarberSort = "rating" | "reviews" | "name";

const SERVICE_FILTERS: { value: ServiceCategory | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "haircut", label: "Cắt tóc" },
  { value: "beard", label: "Chăm sóc râu" },
  { value: "combo", label: "Combo" },
  { value: "treatment", label: "Chăm sóc tóc" },
];

export default function CustomerBookingPage() {
  return (
    <AuthGuard allowedRoles={["customer"]} pageTitle="Đặt lịch cắt tóc">
      <BookingContent />
    </AuthGuard>
  );
}

function BookingContent() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Lựa chọn
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    toDateKey(new Date()),
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dữ liệu từ Supabase
  const loadServices = useCallback(
    () => fetchServices({ activeOnly: true }),
    [],
  );
  const loadBarbers = useCallback(() => fetchBarbers({ activeOnly: true }), []);
  const { data: services = [], loading: servicesLoading } = useAsyncData(
    loadServices,
    {
      errorMessage: "Không tải được danh sách dịch vụ.",
    },
  );
  const { data: barbers = [], loading: barbersLoading } = useAsyncData(
    loadBarbers,
    {
      errorMessage: "Không tải được danh sách thợ.",
    },
  );

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds],
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0),
    [selectedServices],
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices],
  );
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId) ?? null;

  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // Tìm kiếm & lọc dịch vụ (bước 1)
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceCategory, setServiceCategory] = useState<
    ServiceCategory | "all"
  >("all");
  const [serviceSort, setServiceSort] = useState<ServiceSort>("popular");

  // Tìm kiếm & sắp xếp thợ (bước 2)
  const [barberQuery, setBarberQuery] = useState("");
  const [barberSort, setBarberSort] = useState<BarberSort>("rating");

  const filteredServices = useMemo(() => {
    const q = normalizeText(serviceQuery.trim());
    const list = services.filter((s) => {
      if (serviceCategory !== "all" && s.category !== serviceCategory)
        return false;
      if (!q) return true;
      return normalizeText(`${s.name} ${s.tagline}`).includes(q);
    });
    switch (serviceSort) {
      case "price-asc":
        return list.sort((a, b) => a.price - b.price);
      case "price-desc":
        return list.sort((a, b) => b.price - a.price);
      case "duration":
        return list.sort((a, b) => a.durationMinutes - b.durationMinutes);
      default:
        // Gói "Ưa chuộng" lên trước, giữ thứ tự gốc cho phần còn lại
        return list.sort((a, b) => Number(b.popular) - Number(a.popular));
    }
  }, [services, serviceQuery, serviceCategory, serviceSort]);

  const filteredBarbers = useMemo(() => {
    const q = normalizeText(barberQuery.trim());
    const list = barbers.filter(
      (b) => !q || normalizeText(`${b.name} ${b.specialty ?? ""}`).includes(q),
    );
    switch (barberSort) {
      case "reviews":
        return list.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
      default:
        return list.sort(
          (a, b) =>
            (b.rating ?? 0) - (a.rating ?? 0) ||
            (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
            a.name.localeCompare(b.name, "vi"),
        );
    }
  }, [barbers, barberQuery, barberSort]);

  // Phân trang: 6 mục mỗi trang cho dịch vụ và thợ
  const servicesTopRef = useRef<HTMLDivElement>(null);
  const barbersTopRef = useRef<HTMLDivElement>(null);
  const servicePaging = usePagination(
    filteredServices,
    6,
    [serviceQuery, serviceCategory, serviceSort].join("|"),
  );
  const barberPaging = usePagination(
    filteredBarbers,
    6,
    [barberQuery, barberSort].join("|"),
  );
  // Đổi trang thì cuộn về đầu danh sách để người dùng không phải tự cuộn tìm
  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const resetServiceFilters = () => {
    setServiceQuery("");
    setServiceCategory("all");
    setServiceSort("popular");
  };

  // Không tự chọn dịch vụ: khách phải tự chọn, nút "Tiếp tục" sẽ bị disable cho tới khi chọn ít nhất 1
  // Không tự chọn thợ: khách tự bấm chọn, nút "Tiếp tục" bị khóa cho tới khi có thợ

  // Lịch làm việc của thợ + các khoảng giờ đã bận trong ngày
  const loadSchedule = useCallback(
    () => fetchBarberSchedule(selectedBarberId),
    [selectedBarberId],
  );
  const { data: schedule = [], loading: scheduleLoading } = useAsyncData(
    loadSchedule,
    {
      enabled: Boolean(selectedBarberId),
      errorMessage: "Không tải được lịch làm việc của thợ.",
    },
  );

  const loadBusy = useCallback(
    () => fetchBarberBusy(selectedBarberId, selectedDate),
    [selectedBarberId, selectedDate],
  );
  const {
    data: busy = [],
    loading: busyLoading,
    reload: reloadBusy,
  } = useAsyncData(loadBusy, {
    enabled: Boolean(selectedBarberId && selectedDate),
    errorMessage: "Không tải được khung giờ trống.",
  });

  // Tính toán khung giờ khả dụng cho thợ, ngày và dịch vụ đã chọn
  const timeSlots = useMemo(() => {
    if (!selectedBarberId || selectedServices.length === 0) return [];
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    return computeSlots({
      date: selectedDate,
      durationMinutes: totalDuration,
      schedule: schedule.find((s) => s.dayOfWeek === dayOfWeek),
      busy,
    });
  }, [
    selectedBarberId,
    selectedServices,
    totalDuration,
    selectedDate,
    schedule,
    busy,
  ]);

  // Nếu giờ đã chọn không còn khả dụng khi đổi ngày / thợ / dịch vụ thì bỏ chọn
  useEffect(() => {
    if (!selectedTime) return;
    const match = timeSlots.find((s) => s.time === selectedTime);
    if (match && !match.available) setSelectedTime("");
  }, [timeSlots, selectedTime]);

  // 5 ngày gần nhất với định dạng dd/MM/yyyy và kèm cụ thể thứ trong tuần
  const upcomingDates = useMemo(() => {
    const list = [];
    for (let i = 0; i < 5; i++) {
      const d = addDays(new Date(), i);
      const dayOfWeek = getWeekdayVN(d);
      const dayName =
        i === 0
          ? `Hôm nay (${dayOfWeek})`
          : i === 1
            ? `Ngày mai (${dayOfWeek})`
            : dayOfWeek;
      list.push({
        dateStr: toDateKey(d),
        dayName,
        dayFormattedVN: formatDateVN(d),
      });
    }
    return list;
  }, []);

  const handleConfirm = async () => {
    if (selectedServices.length === 0 || !selectedBarber) {
      toast.error("Vui lòng chọn đủ dịch vụ, thợ và khung giờ");
      return;
    }
    const result = validateWithToast(
      bookingRequestSchema,
      {
        serviceIds: selectedServices.map((s) => s.id),
        barberId: selectedBarber.id,
        date: selectedDate,
        time: selectedTime,
        notes,
      },
      setErrors,
    );
    if (!result.success) {
      if (result.errors.time || result.errors.date) setStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingId = await createBooking({
        barberId: result.data.barberId,
        date: result.data.date,
        time: result.data.time,
        serviceIds: result.data.serviceIds,
        notes: result.data.notes,
      });
      setCreatedBooking({
        id: bookingId,
        date: result.data.date,
        time: result.data.time,
        price: totalPrice,
        barberName: selectedBarber.name,
      });
      setStep(5);
      toast.success("Đặt lịch thành công!", {
        description: `Lịch hẹn lúc ${result.data.time} ngày ${formatDateVN(result.data.date)} đã được gửi đến salon.`,
      });
    } catch (err) {
      const message = reportError(err, "Có lỗi xảy ra khi lưu lịch hẹn");
      // Giờ vừa bị người khác đặt / thợ nghỉ...: tải lại giờ trống và quay về bước chọn giờ
      if (/đặt trước|nghỉ|ngoài ca|đã qua/i.test(message)) {
        setSelectedTime("");
        setStep(3);
        void reloadBusy();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* Thanh tiến trình tinh giản */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto px-2">
            {[
              { num: 1, label: "Dịch vụ" },
              { num: 2, label: "Chọn thợ" },
              { num: 3, label: "Giờ cắt" },
              { num: 4, label: "Thông tin" },
            ].map((s) => (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num < step && step !== 5)
                    setStep(s.num as 1 | 2 | 3 | 4);
                }}
                className={`flex items-center gap-2 cursor-pointer transition-colors ${
                  step === s.num
                    ? "text-gold font-bold"
                    : step > s.num
                      ? "text-slate-300"
                      : "text-slate-600"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                      : step > s.num
                        ? "bg-emerald-600 text-[#fff]"
                        : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                </div>
                <span className="text-xs hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-2xl mx-auto mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${step === 5 ? 100 : ((step - 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* BƯỚC 1: CHỌN DỊCH VỤ */}
        {step === 1 && (
          <FadeUp key="step-1" className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-white">
                Bước 1: Chọn Dịch Vụ Cắt Tóc
              </h1>
              <p className="text-xs text-slate-400">
                Chọn một hoặc nhiều dịch vụ phù hợp với phong cách của bạn
              </p>
            </div>

            {servicesLoading && (
              <p className="text-center text-xs text-slate-500">
                Đang tải dịch vụ...
              </p>
            )}

            {/* Tìm kiếm & lọc dịch vụ */}
            <div ref={servicesTopRef} className="scroll-mt-24 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    value={serviceQuery}
                    onChange={(e) => setServiceQuery(e.target.value)}
                    placeholder="Tìm theo tên dịch vụ..."
                    className="h-9 pl-9 text-xs bg-slate-950 border-slate-800"
                  />
                </div>
                <Select
                  value={serviceSort}
                  onValueChange={(v) => setServiceSort(v as ServiceSort)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-[210px] text-xs bg-slate-950 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Ưa chuộng trước</SelectItem>
                    <SelectItem value="price-asc">Giá: thấp → cao</SelectItem>
                    <SelectItem value="price-desc">Giá: cao → thấp</SelectItem>
                    <SelectItem value="duration">
                      Thời lượng: ngắn → dài
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {SERVICE_FILTERS.map((f) => {
                  const active = serviceCategory === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setServiceCategory(f.value)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        active
                          ? "bg-amber-500 border-amber-400 text-neutral-950 font-semibold"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {!servicesLoading && filteredServices.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-slate-500">
                  Không tìm thấy dịch vụ phù hợp.
                </p>
                <button
                  type="button"
                  onClick={resetServiceFilters}
                  className="text-xs text-gold underline underline-offset-4"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicePaging.pageItems.map((srv) => {
                const isSelected = selectedServiceIds.includes(srv.id);
                return (
                  <div
                    key={srv.id}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => toggleService(srv.id)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleService(srv.id);
                      }
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-slate-900 border-amber-400 ring-1 ring-amber-400 shadow-lg shadow-amber-500/10"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm">
                            {srv.name}
                          </h3>
                          {srv.popular && (
                            <Badge
                              variant="gold"
                              className="text-[10px] py-0 px-1.5"
                            >
                              Ưa chuộng
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gold/90 font-medium mt-0.5">
                          {srv.tagline}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-gold font-mono">
                          {formatVND(srv.price)}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {srv.durationMinutes} phút
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {srv.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <Pagination
              page={servicePaging.page}
              totalPages={servicePaging.totalPages}
              onPageChange={(p) => {
                servicePaging.setPage(p);
                scrollToRef(servicesTopRef);
              }}
              className="pt-4"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-400">
                Đã chọn{" "}
                <span className="font-semibold text-white">
                  {selectedServices.length}
                </span>{" "}
                dịch vụ •{" "}
                <span className="font-mono text-white">
                  {totalDuration} phút
                </span>{" "}
                •{" "}
                <span className="font-mono text-gold">
                  {formatVND(totalPrice)}
                </span>
              </p>
              <Button
                variant="gold"
                size="lg"
                disabled={selectedServices.length === 0}
                onClick={() => setStep(2)}
                className="text-xs font-semibold gap-2"
              >
                Tiếp tục chọn thợ
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </FadeUp>
        )}

        {/* BƯỚC 2: CHỌN THỢ CẮT TÓC */}
        {step === 2 && (
          <FadeUp key="step-2" className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-white">
                Bước 2: Chọn Thợ Cắt Tóc
              </h1>
              <p className="text-xs text-slate-400">
                Đội ngũ Master Barber tay nghề cao của tiệm
              </p>
            </div>

            {barbersLoading && (
              <p className="text-center text-xs text-slate-500">
                Đang tải danh sách thợ...
              </p>
            )}

            {/* Tìm kiếm & sắp xếp thợ */}
            <div
              ref={barbersTopRef}
              className="scroll-mt-24 flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={barberQuery}
                  onChange={(e) => setBarberQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc chuyên môn..."
                  className="h-9 pl-9 text-xs bg-slate-950 border-slate-800"
                />
              </div>
              <Select
                value={barberSort}
                onValueChange={(v) => setBarberSort(v as BarberSort)}
              >
                <SelectTrigger className="h-9 w-full sm:w-[210px] text-xs bg-slate-950 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Đánh giá cao nhất</SelectItem>
                  <SelectItem value="reviews">
                    Nhiều lượt đánh giá nhất
                  </SelectItem>
                  <SelectItem value="name">Tên A → Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!barbersLoading && filteredBarbers.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-slate-500">
                  Không tìm thấy thợ phù hợp.
                </p>
                <button
                  type="button"
                  onClick={() => setBarberQuery("")}
                  className="text-xs text-gold underline underline-offset-4"
                >
                  Xóa tìm kiếm
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {barberPaging.pageItems.map((b) => {
                const isSelected = selectedBarber?.id === b.id;
                return (
                  <div
                    key={b.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => {
                      // Bấm lại thợ đang chọn sẽ bỏ chọn
                      setSelectedBarberId(isSelected ? "" : b.id);
                      setSelectedTime("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        setSelectedBarberId(isSelected ? "" : b.id);
                        setSelectedTime("");
                      }
                    }}
                    className={`p-5 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-slate-900 border-amber-400 ring-1 ring-amber-400 shadow-lg shadow-amber-500/10"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-center mb-3">
                      <UserAvatar name={b.name} role="barber" size="xl" />
                    </div>
                    <h3 className="font-bold text-white text-sm">{b.name}</h3>
                    <p className="text-xs text-gold mt-0.5">{b.specialty}</p>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {b.bio}
                    </p>
                  </div>
                );
              })}
            </div>

            <Pagination
              page={barberPaging.page}
              totalPages={barberPaging.totalPages}
              onPageChange={(p) => {
                barberPaging.setPage(p);
                scrollToRef(barbersTopRef);
              }}
              className="pt-4"
            />

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs border-slate-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>

              <Button
                variant="gold"
                size="sm"
                disabled={!selectedBarber}
                onClick={() => setStep(3)}
                className="text-xs font-semibold gap-1.5"
              >
                Tiếp tục chọn giờ
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </FadeUp>
        )}

        {/* BƯỚC 3: CHỌN NGÀY & KHUNG GIỜ (ĐỊNH DẠNG dd/MM/yyyy) */}
        {step === 3 && (
          <FadeUp key="step-3" className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-white">
                Bước 3: Chọn Ngày &amp; Khung Giờ
              </h1>
              <p className="text-xs text-slate-400">
                Lịch trống của thợ{" "}
                <strong className="text-gold">{selectedBarber?.name}</strong>
              </p>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-5">
              {/* Chọn Ngày Format dd/MM/yyyy */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">
                    Chọn ngày hẹn:
                  </Label>
                  <span className="text-xs text-gold font-mono font-bold">
                    Ngày đã chọn: {formatDateVN(selectedDate)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {upcomingDates.map((item) => {
                    const isActive = selectedDate === item.dateStr;
                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(item.dateStr);
                          setSelectedTime("");
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isActive
                            ? "bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="block text-xs font-semibold">
                          {item.dayName}
                        </span>
                        <span className="block text-[11px] font-mono mt-0.5">
                          {item.dayFormattedVN}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Chọn ngày khác (xa hơn 5 ngày tới, tối đa 90 ngày) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                  <Label
                    htmlFor="custom-date"
                    className="text-xs text-slate-300 shrink-0"
                  >
                    Hoặc chọn ngày khác:
                  </Label>
                  <Input
                    id="custom-date"
                    type="date"
                    min={toDateKey(new Date())}
                    max={toDateKey(addDays(new Date(), 90))}
                    value={selectedDate}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setSelectedDate(e.target.value);
                      setSelectedTime("");
                    }}
                    className="h-9 text-xs font-mono bg-slate-950 border-slate-800 sm:max-w-[200px]"
                  />
                  <span className="text-[11px] text-slate-500">
                    Đặt trước tối đa 90 ngày
                  </span>
                </div>
              </div>

              {/* Khung giờ trực quan */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">
                    Khung giờ còn trống ngày {formatDateVN(selectedDate)}:
                  </Label>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Còn trống
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-700"></span>
                      Đã kín
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {(scheduleLoading || busyLoading) && (
                    <p className="col-span-full text-xs text-slate-500 py-2">
                      Đang tải khung giờ trống...
                    </p>
                  )}
                  {timeSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    const isAvailable = slot.available;

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`p-2.5 rounded-xl border text-center transition-all duration-150 ${
                          isSelected
                            ? "bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md ring-2 ring-amber-400"
                            : isAvailable
                              ? "bg-slate-950 border-emerald-500/40 text-ok hover:bg-emerald-500/15 cursor-pointer font-medium"
                              : "bg-slate-950/60 border-slate-800/60 text-slate-600 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <span className="block text-xs font-mono">
                          {slot.time}
                        </span>
                        <span className="block text-[9px] mt-0.5">
                          {isSelected
                            ? "Đã chọn"
                            : isAvailable
                              ? "Còn chỗ"
                              : slotReasonLabel(slot.reason)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                className="text-xs border-slate-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>

              <Button
                variant="gold"
                size="sm"
                disabled={!selectedTime}
                onClick={() => setStep(4)}
                className="text-xs font-semibold gap-1.5"
              >
                Tiếp tục nhập thông tin
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </FadeUp>
        )}

        {/* BƯỚC 4: THÔNG TIN KHÁCH HÀNG & XÁC NHẬN */}
        {step === 4 && (
          <FadeUp key="step-4" className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-white">
                Bước 4: Thông Tin &amp; Xác Nhận
              </h1>
              <p className="text-xs text-slate-400">
                Kiểm tra lại thông tin trước khi hoàn tất đặt lịch
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form thông tin */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3.5">
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                  Thông Tin Liên Hệ Của Bạn
                </h3>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">Họ và tên:</span>
                    <span className="font-semibold text-white">
                      {user?.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">Số điện thoại:</span>
                    <span className="font-semibold text-white font-mono">
                      {user?.phone || "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-slate-300 break-all">
                      {user?.email}
                    </span>
                  </div>
                  <p className="pt-1 text-[11px] text-slate-500">
                    Thông tin lấy từ tài khoản của bạn.{" "}
                    <Link href="/profile" className="text-gold hover:underline">
                      Chỉnh sửa hồ sơ
                    </Link>
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    Ghi chú về kiểu tóc / Yêu cầu riêng
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ví dụ: Cắt Fade thấp, tỉa mái layer..."
                    className={`h-9 text-xs bg-slate-950 border-slate-800 ${errorRing(errors.notes)}`}
                  />
                  <FieldError message={errors.notes} />
                </div>
              </div>

              {/* Tóm tắt phiếu hẹn */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase text-gold">
                    Phiếu Đặt Lịch Hẹn
                  </span>
                  <Badge variant="pending">Chờ xác nhận</Badge>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dịch vụ:</span>
                    <span className="font-semibold text-white text-right">
                      {selectedServices.map((s) => s.name).join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thời lượng dự kiến:</span>
                    <span className="font-semibold text-white font-mono">
                      {totalDuration} phút
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thợ phụ trách:</span>
                    <span className="font-semibold text-white">
                      {selectedBarber?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ngày hẹn:</span>
                    <span className="font-semibold text-white font-mono">
                      {formatDateVN(selectedDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Khung giờ:</span>
                    <span className="font-bold text-gold font-mono text-sm">
                      {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                    <span className="text-slate-300 font-medium">
                      Tổng tiền thanh toán tại tiệm:
                    </span>
                    <span className="font-extrabold text-gold font-mono">
                      {formatVND(totalPrice)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  * Không cần thanh toán trước. Quý khách thanh toán tại salon
                  sau khi hoàn tất dịch vụ.
                </p>

                <Button
                  variant="gold"
                  size="lg"
                  disabled={isSubmitting || !selectedTime}
                  onClick={handleConfirm}
                  className="w-full text-xs font-bold gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isSubmitting ? "Đang lưu lịch..." : "Xác Nhận Đặt Lịch Ngay"}
                </Button>
              </div>
            </div>

            <div className="flex justify-start pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(3)}
                className="text-xs border-slate-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Đổi giờ hoặc ngày
              </Button>
            </div>
          </FadeUp>
        )}

        {/* BƯỚC 5: ĐẶT LỊCH THÀNH CÔNG */}
        {step === 5 && createdBooking && (
          <div className="bg-slate-900/90 border border-emerald-500/40 p-8 rounded-2xl text-center space-y-5 max-w-lg mx-auto shadow-2xl">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-ok border border-emerald-500/40 flex items-center justify-center mx-auto">
              <Check className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">
                Đặt Lịch Hẹn Thành Công!
              </h2>
              <p className="text-xs text-slate-400">
                Cảm ơn quý khách <strong>{user?.name}</strong> đã tin tưởng
                Vanguard &amp; Blade
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Mã lịch hẹn:</span>
                <span className="font-mono font-bold text-gold">
                  {shortBookingCode(createdBooking.id)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian:</span>
                <span className="font-semibold text-white font-mono">
                  {createdBooking.time} • Ngày{" "}
                  {formatDateVN(createdBooking.date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thợ phục vụ:</span>
                <span className="font-semibold text-white">
                  {createdBooking.barberName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chi phí dự kiến:</span>
                <span className="font-bold text-gold font-mono">
                  {formatVND(createdBooking.price)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <Button
                variant="gold"
                size="sm"
                asChild
                className="w-full sm:w-auto text-xs"
              >
                <Link href="/customer/appointments">
                  Xem Danh Sách Lịch Hẹn Của Tôi
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep(1);
                  setSelectedTime("");
                  setCreatedBooking(null);
                }}
                className="w-full sm:w-auto text-xs border-slate-700"
              >
                Đặt thêm lịch khác
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
