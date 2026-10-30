"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import {
  BarChart3,
  Calendar,
  Users,
  Scissors,
  DollarSign,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Play,
  Check,
  Clock,
  Lock,
  Unlock,
  UserPlus,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EditBookingModal } from "@/components/EditBookingModal";
import { useConfirm } from "@/components/useConfirm";
import { AuthGuard } from "@/components/AuthGuard";
import { UserAvatar } from "@/components/UserAvatar";
import { FieldError, errorRing } from "@/components/FieldError";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchBookings,
  fetchBarbers,
  fetchServices,
  fetchProfilesByRole,
  setBookingStatus,
  deleteBooking,
  createService,
  updateService,
  setServiceActive,
  deleteService,
  updateProfile,
  setProfileLocked,
  adminCreateUser,
  adminDeleteUser,
} from "@/lib/data";
import { formatVND, formatDateVN } from "@/lib/format";
import type { Booking, BookingStatus, Service, User } from "@/lib/types";
import { getStatusLabel, getStatusBadgeVariant } from "@/lib/statusHelper";
import {
  adminCreateUserSchema,
  adminEditUserSchema,
  serviceFormSchema,
} from "@/lib/schemas";
import { validate, type FieldErrors } from "@/lib/validation";
import { reportError } from "@/lib/errors";
import { useAsyncData } from "@/hooks/use-async-data";
import { Pagination, usePagination } from "@/components/Pagination";

type AdminTab = "analytics" | "bookings" | "barbers" | "services" | "customers";

type RevPeriod = "today" | "7d" | "30d" | "all";
type BarberSortKey = "revenue" | "appointments" | "name";
type ServiceSortKey = "revenue" | "count" | "name";

const PERIOD_OPTIONS: { value: RevPeriod; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" },
  { value: "all", label: "Toàn bộ" },
];

/** Chuẩn hóa để tìm kiếm không phân biệt hoa thường và dấu tiếng Việt */
function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard allowedRoles={["admin"]} pageTitle="Bảng quản trị tiệm">
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>("analytics");

  const loadAll = useCallback(async () => {
    const [bookings, barbers, services, customers] = await Promise.all([
      fetchBookings(),
      fetchBarbers(),
      fetchServices(),
      fetchProfilesByRole("customer"),
    ]);
    return { bookings, barbers, services, customers };
  }, []);
  const { data, loading, reload } = useAsyncData(loadAll, {
    errorMessage: "Không tải được dữ liệu quản trị.",
  });

  const bookings = useMemo<Booking[]>(() => data?.bookings ?? [], [data]);
  const barbers = useMemo<User[]>(() => data?.barbers ?? [], [data]);
  const services = useMemo<Service[]>(() => data?.services ?? [], [data]);
  const users = useMemo<User[]>(() => data?.customers ?? [], [data]);

  // Bộ lọc lịch hẹn
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [barberFilter, setBarberFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal sửa lịch
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Modal thêm/sửa tài khoản (thợ hoặc khách)
  const [userModal, setUserModal] = useState<{
    open: boolean;
    role: "barber" | "customer";
    editing: User | null;
  }>({
    open: false,
    role: "barber",
    editing: null,
  });
  const [uName, setUName] = useState("");
  const [uPhone, setUPhone] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uSpecialty, setUSpecialty] = useState("");
  const [uBio, setUBio] = useState("");
  const [userErrors, setUserErrors] = useState<FieldErrors>({});

  // Modal thêm/sửa dịch vụ
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [srvName, setSrvName] = useState("");
  const [srvTagline, setSrvTagline] = useState("");
  const [srvDesc, setSrvDesc] = useState("");
  const [srvPrice, setSrvPrice] = useState("180000");
  const [srvDuration, setSrvDuration] = useState("45");
  const [srvPopular, setSrvPopular] = useState(false);
  const [srvErrors, setSrvErrors] = useState<FieldErrors>({});

  // Hộp xác nhận dùng chung cho khóa / tạm ngưng / xóa
  const { ask, confirmDialog } = useConfirm();

  const [saving, setSaving] = useState(false);

  /** Chạy một thao tác ghi: báo lỗi bằng toast, tải lại dữ liệu khi thành công. */
  const act = async (
    fn: () => Promise<void>,
    successMessage: string,
    failMessage: string,
  ): Promise<boolean> => {
    try {
      await fn();
      toast.success(successMessage);
      await reload();
      return true;
    } catch (err) {
      reportError(err, failMessage);
      return false;
    }
  };

  // THỐNG KÊ CHI TIẾT DOANH THU & HOẠT ĐỘNG
  // Bộ lọc báo cáo: khoảng thời gian, tìm kiếm và sắp xếp cho từng danh sách
  const [revPeriod, setRevPeriod] = useState<RevPeriod>("all");
  const [barberQuery, setBarberQuery] = useState("");
  const [barberSort, setBarberSort] = useState<BarberSortKey>("revenue");
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceSort, setServiceSort] = useState<ServiceSortKey>("revenue");

  const analyticsData = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayBookings = bookings.filter((b) => b.date === todayStr);

    // Chỉ tính các lượt đặt trong khoảng thời gian đã chọn
    const fromStr =
      revPeriod === "all"
        ? null
        : revPeriod === "today"
          ? todayStr
          : format(
              subDays(new Date(), revPeriod === "7d" ? 6 : 29),
              "yyyy-MM-dd",
            );
    const scoped = fromStr
      ? bookings.filter((b) => b.date >= fromStr && b.date <= todayStr)
      : bookings;

    const nonCancelled = scoped.filter((b) => b.status !== "cancelled");
    const totalRev = nonCancelled.reduce((acc, b) => acc + b.price, 0);

    const todayRev = todayBookings
      .filter((b) => b.status !== "cancelled")
      .reduce((acc, b) => acc + b.price, 0);

    const completedBookings = scoped.filter((b) => b.status === "completed");
    const completionRate =
      scoped.length > 0
        ? Math.round((completedBookings.length / scoped.length) * 100)
        : 0;

    const barberStats = barbers.map((barber) => {
      const bBookings = nonCancelled.filter((b) => b.barberId === barber.id);
      const bCompleted = bBookings.filter(
        (b) => b.status === "completed",
      ).length;
      const bRev = bBookings.reduce((acc, b) => acc + b.price, 0);
      const percentage = totalRev > 0 ? Math.round((bRev / totalRev) * 100) : 0;
      return {
        barber,
        totalAppointments: bBookings.length,
        completedAppointments: bCompleted,
        revenue: bRev,
        percentage,
      };
    });

    // Doanh thu theo dịch vụ: tính theo giá lúc đặt của từng dịch vụ trong phiếu
    const serviceStats = services.map((service) => {
      let count = 0;
      let sRev = 0;
      nonCancelled.forEach((b) => {
        b.services.forEach((item) => {
          if (item.serviceId === service.id) {
            count += 1;
            sRev += item.priceAtBooking;
          }
        });
      });
      const percentage = totalRev > 0 ? Math.round((sRev / totalRev) * 100) : 0;
      return { service, count, revenue: sRev, percentage };
    });

    return {
      todayRev,
      totalRev,
      todayBookingsCount: todayBookings.length,
      totalBookingsCount: scoped.length,
      completionRate,
      barberStats,
      serviceStats,
      averageOrderValue:
        nonCancelled.length > 0
          ? Math.round(totalRev / nonCancelled.length)
          : 0,
    };
  }, [bookings, barbers, services, revPeriod]);

  // Lọc + sắp xếp theo tìm kiếm, sau đó chia trang
  const barberRows = useMemo(() => {
    const q = normalizeSearch(barberQuery);
    const rows = analyticsData.barberStats.filter(
      (r) => !q || normalizeSearch(r.barber.name).includes(q),
    );
    return rows.sort((a, b) => {
      if (barberSort === "name")
        return a.barber.name.localeCompare(b.barber.name, "vi");
      if (barberSort === "appointments")
        return b.totalAppointments - a.totalAppointments;
      return b.revenue - a.revenue;
    });
  }, [analyticsData, barberQuery, barberSort]);

  const serviceRows = useMemo(() => {
    const q = normalizeSearch(serviceQuery);
    const rows = analyticsData.serviceStats.filter(
      (r) => !q || normalizeSearch(r.service.name).includes(q),
    );
    return rows.sort((a, b) => {
      if (serviceSort === "name")
        return a.service.name.localeCompare(b.service.name, "vi");
      if (serviceSort === "count") return b.count - a.count;
      return b.revenue - a.revenue;
    });
  }, [analyticsData, serviceQuery, serviceSort]);

  const barberPaging = usePagination(
    barberRows,
    5,
    `${revPeriod}|${barberQuery}|${barberSort}`,
  );
  const servicePaging = usePagination(
    serviceRows,
    8,
    `${revPeriod}|${serviceQuery}|${serviceSort}`,
  );

  // Lọc danh sách lịch hẹn
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (dateFilter !== "all" && b.date !== dateFilter) return false;
      if (barberFilter !== "all" && b.barberId !== barberFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = normalizeSearch(searchQuery);
        return (
          normalizeSearch(b.customerName).includes(q) ||
          b.customerPhone.includes(searchQuery.trim()) ||
          normalizeSearch(b.customerEmail).includes(q)
        );
      }
      return true;
    });
  }, [bookings, dateFilter, barberFilter, statusFilter, searchQuery]);

  const bookingListTopRef = useRef<HTMLDivElement>(null);
  const bookingPaging = usePagination(
    filteredBookings,
    8,
    `${dateFilter}|${barberFilter}|${statusFilter}|${searchQuery}`,
  );
  const scrollToBookingTop = () =>
    bookingListTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

  // Tab thợ: tìm kiếm theo tên + lọc theo trạng thái khóa
  const [barberTabQuery, setBarberTabQuery] = useState("");
  const [barberTabStatus, setBarberTabStatus] = useState<
    "all" | "active" | "locked"
  >("all");
  const barberTabRows = useMemo(() => {
    const q = normalizeSearch(barberTabQuery);
    return barbers.filter((b) => {
      if (barberTabStatus === "active" && b.isLocked) return false;
      if (barberTabStatus === "locked" && !b.isLocked) return false;
      return (
        !q ||
        normalizeSearch(b.name).includes(q) ||
        b.phone.includes(barberTabQuery.trim())
      );
    });
  }, [barbers, barberTabQuery, barberTabStatus]);
  const barberTabTopRef = useRef<HTMLDivElement>(null);
  const barberTabPaging = usePagination(
    barberTabRows,
    6,
    `${barberTabQuery}|${barberTabStatus}`,
  );

  // Tab dịch vụ: tìm theo tên + lọc theo trạng thái hiển thị
  const [svcTabQuery, setSvcTabQuery] = useState("");
  const [svcTabStatus, setSvcTabStatus] = useState<"all" | "active" | "paused">(
    "all",
  );
  const svcTabRows = useMemo(() => {
    const q = normalizeSearch(svcTabQuery);
    return services.filter((srv) => {
      if (svcTabStatus === "active" && !srv.isActive) return false;
      if (svcTabStatus === "paused" && srv.isActive) return false;
      return !q || normalizeSearch(srv.name).includes(q);
    });
  }, [services, svcTabQuery, svcTabStatus]);
  const svcTabTopRef = useRef<HTMLDivElement>(null);
  const svcTabPaging = usePagination(
    svcTabRows,
    6,
    `${svcTabQuery}|${svcTabStatus}`,
  );

  // Danh sách khách hàng kèm thống kê (theo customerId)
  const customerList = useMemo(() => {
    return users.map((cust) => {
      const cBookings = bookings.filter((b) => b.customerId === cust.id);
      const completed = cBookings.filter(
        (b) => b.status === "completed",
      ).length;
      const totalSpent = cBookings
        .filter((b) => b.status !== "cancelled")
        .reduce((sum, b) => sum + b.price, 0);
      return {
        ...cust,
        bookingCount: cBookings.length,
        completedCount: completed,
        totalSpent,
      };
    });
  }, [users, bookings]);

  // Tab khách hàng: tìm theo tên, email, SĐT + lọc theo trạng thái khóa
  const [custTabQuery, setCustTabQuery] = useState("");
  const [custTabStatus, setCustTabStatus] = useState<
    "all" | "active" | "locked"
  >("all");
  const custTabRows = useMemo(() => {
    const q = normalizeSearch(custTabQuery);
    const raw = custTabQuery.trim();
    return customerList.filter((c) => {
      if (custTabStatus === "active" && c.isLocked) return false;
      if (custTabStatus === "locked" && !c.isLocked) return false;
      if (!q) return true;
      return (
        normalizeSearch(c.name).includes(q) ||
        normalizeSearch(c.email).includes(q) ||
        c.phone.includes(raw)
      );
    });
  }, [customerList, custTabQuery, custTabStatus]);
  const custTabTopRef = useRef<HTMLDivElement>(null);
  const custTabPaging = usePagination(
    custTabRows,
    8,
    `${custTabQuery}|${custTabStatus}`,
  );

  // === Lịch hẹn ===
  const handleUpdateStatus = (id: string, newStatus: BookingStatus) =>
    act(
      () => setBookingStatus(id, newStatus),
      `Đã cập nhật trạng thái: ${getStatusLabel(newStatus)}`,
      "Không cập nhật được trạng thái.",
    );

  const handleDeleteBooking = (id: string) => {
    ask({
      title: "Xóa lịch hẹn này?",
      description: "Lịch hẹn sẽ bị xóa khỏi hệ thống và không thể khôi phục.",
      confirmLabel: "Xóa lịch hẹn",
      destructive: true,
      onConfirm: () =>
        void act(
          () => deleteBooking(id),
          "Đã xóa lịch hẹn",
          "Không xóa được lịch hẹn.",
        ),
    });
  };

  // === Tài khoản (thợ / khách) ===
  const openUserModal = (role: "barber" | "customer", editing: User | null) => {
    setUserModal({ open: true, role, editing });
    setUName(editing?.name ?? "");
    setUPhone(editing?.phone ?? "");
    setUEmail(editing?.email ?? "");
    setUPassword("");
    setUSpecialty(editing?.specialty ?? "");
    setUBio(editing?.bio ?? "");
    setUserErrors({});
  };
  const closeUserModal = () => setUserModal((m) => ({ ...m, open: false }));

  const handleOpenAddBarber = () => openUserModal("barber", null);
  const handleOpenEditBarber = (b: User) => openUserModal("barber", b);
  const handleOpenAddCustomer = () => openUserModal("customer", null);
  const handleOpenEditCustomer = (c: User) => openUserModal("customer", c);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { role, editing } = userModal;
    const isBarber = role === "barber";

    const result = editing
      ? validate(adminEditUserSchema, {
          fullName: uName,
          phone: uPhone,
          specialty: isBarber ? uSpecialty : undefined,
          bio: isBarber ? uBio : undefined,
        })
      : validate(adminCreateUserSchema, {
          role,
          fullName: uName,
          email: uEmail,
          phone: uPhone,
          password: uPassword,
          specialty: isBarber ? uSpecialty : undefined,
          bio: isBarber ? uBio : undefined,
        });
    setUserErrors(result.errors);
    if (!result.success) {
      toast.error(result.firstError);
      return;
    }

    setSaving(true);
    const ok = editing
      ? await act(
          async () => {
            const d = result.data as {
              fullName: string;
              phone: string;
              specialty?: string;
              bio?: string;
            };
            await updateProfile(editing.id, {
              fullName: d.fullName,
              phone: d.phone,
              specialty: d.specialty,
              bio: d.bio,
            });
          },
          isBarber
            ? "Đã cập nhật thông tin thợ cắt tóc"
            : "Đã cập nhật thông tin khách hàng",
          "Không cập nhật được thông tin tài khoản.",
        )
      : await act(
          () =>
            adminCreateUser(
              result.data as Parameters<typeof adminCreateUser>[0],
            ),
          isBarber
            ? "Đã thêm thợ cắt tóc mới vào hệ thống"
            : "Đã thêm khách hàng mới",
          "Không tạo được tài khoản.",
        );
    setSaving(false);
    if (ok) closeUserModal();
  };

  const handleToggleLockUser = (u: User, label: string) => {
    const next = !u.isLocked;
    ask({
      title: next
        ? `Khóa tài khoản ${label} ${u.name}?`
        : `Mở khóa tài khoản ${label} ${u.name}?`,
      description: next
        ? `Tài khoản sẽ không thể đăng nhập cho đến khi được mở khóa. Các lịch hẹn đang có vẫn được giữ nguyên.`
        : `Tài khoản sẽ đăng nhập và sử dụng hệ thống bình thường trở lại.`,
      confirmLabel: next ? "Khóa tài khoản" : "Mở khóa",
      destructive: next,
      onConfirm: () =>
        void act(
          () => setProfileLocked(u.id, next),
          next
            ? `Đã KHÓA tài khoản ${label} ${u.name}.`
            : `Đã MỞ KHÓA tài khoản ${label} ${u.name}.`,
          "Không đổi được trạng thái khóa.",
        ),
    });
  };
  const handleToggleLockBarber = (b: User) => handleToggleLockUser(b, "thợ");
  const handleToggleLockCustomer = (c: User) =>
    handleToggleLockUser(c, "khách");

  const handleDeleteBarber = (b: User) => {
    ask({
      title: `Xóa vĩnh viễn thợ ${b.name}?`,
      description:
        "Tài khoản thợ sẽ bị xóa khỏi hệ thống và không thể khôi phục.",
      confirmLabel: "Xóa thợ",
      destructive: true,
      onConfirm: () =>
        void act(
          () => adminDeleteUser(b.id),
          "Đã xóa tài khoản thợ",
          "Không xóa được tài khoản thợ.",
        ),
    });
  };
  const handleDeleteCustomer = (c: User) => {
    ask({
      title: `Xóa tài khoản khách ${c.name}?`,
      description:
        "Toàn bộ lịch hẹn của khách này cũng sẽ bị xóa. Hành động này không thể khôi phục.",
      confirmLabel: "Xóa khách",
      destructive: true,
      onConfirm: () =>
        void act(
          () => adminDeleteUser(c.id),
          "Đã xóa khách hàng khỏi danh bạ",
          "Không xóa được khách hàng.",
        ),
    });
  };

  // === Dịch vụ ===
  const handleOpenAddService = () => {
    setEditingService(null);
    setSrvName("");
    setSrvTagline("");
    setSrvDesc("");
    setSrvPrice("180000");
    setSrvDuration("45");
    setSrvPopular(false);
    setSrvErrors({});
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (srv: Service) => {
    setEditingService(srv);
    setSrvName(srv.name);
    setSrvTagline(srv.tagline);
    setSrvDesc(srv.description);
    setSrvPrice(srv.price.toString());
    setSrvDuration(srv.durationMinutes.toString());
    setSrvPopular(srv.popular);
    setSrvErrors({});
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validate(serviceFormSchema, {
      name: srvName,
      tagline: srvTagline,
      description: srvDesc,
      price: srvPrice.trim() === "" ? "x" : srvPrice,
      durationMinutes: srvDuration.trim() === "" ? "x" : srvDuration,
      popular: srvPopular,
    });
    setSrvErrors(result.errors);
    if (!result.success) {
      toast.error(result.firstError);
      return;
    }

    setSaving(true);
    const ok = editingService
      ? await act(
          () => updateService(editingService.id, result.data),
          "Đã cập nhật dịch vụ",
          "Không cập nhật được dịch vụ.",
        )
      : await act(
          () => createService(result.data),
          "Đã thêm dịch vụ mới vào bảng giá",
          "Không thêm được dịch vụ.",
        );
    setSaving(false);
    if (ok) setIsServiceModalOpen(false);
  };

  const handleToggleLockService = (srv: Service) => {
    const nextActive = !srv.isActive;
    ask({
      title: nextActive
        ? `Mở lại gói dịch vụ "${srv.name}"?`
        : `Tạm ngưng gói dịch vụ "${srv.name}"?`,
      description: nextActive
        ? `Khách sẽ có thể đặt gói này trở lại.`
        : `Khách sẽ không thể đặt gói này cho đến khi được mở lại. Các lịch hẹn đã đặt trước đó vẫn giữ nguyên.`,
      confirmLabel: nextActive ? "Mở lại" : "Tạm ngưng",
      destructive: !nextActive,
      onConfirm: () =>
        void act(
          () => setServiceActive(srv.id, nextActive),
          nextActive
            ? `Đã MỞ LẠI gói dịch vụ "${srv.name}".`
            : `Đã TẠM NGƯNG gói dịch vụ "${srv.name}". Khách sẽ không thể đặt gói này.`,
          "Không đổi được trạng thái dịch vụ.",
        ),
    });
  };

  const handleDeleteService = (srv: Service) => {
    ask({
      title: `Xóa dịch vụ "${srv.name}"?`,
      description:
        "Dịch vụ sẽ bị xóa khỏi hệ thống. Nếu gói này đã có lịch hẹn, hãy dùng Tạm ngưng thay vì xóa.",
      confirmLabel: "Xóa dịch vụ",
      destructive: true,
      onConfirm: () =>
        void act(
          () => deleteService(srv.id),
          "Đã xóa dịch vụ",
          "Không xóa được dịch vụ (có thể đã có lịch hẹn dùng gói này — hãy dùng Tạm ngưng).",
        ),
    });
  };

  const isBarberModal = userModal.role === "barber";

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        {loading && !data && (
          <p className="text-xs text-slate-500">Đang tải dữ liệu quản trị...</p>
        )}
        {/* TIÊU ĐỀ TRANG ADMIN */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="gold">Bảng Quản Trị Hệ Thống</Badge>
              <span className="text-xs text-slate-400 font-mono">
                {format(new Date(), "EEEE, dd/MM/yyyy")}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Trung Tâm Quản Trị Tiệm Tóc Quý Ông
            </h1>
            <p className="text-xs text-slate-400">
              Quản trị toàn diện doanh thu, bảng giá, ca làm việc của thợ và
              lịch hẹn khách hàng
            </p>
          </div>
        </div>

        {/* CÁC TAB QUẢN LÝ RIÊNG BIỆT */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 text-xs font-semibold">
          {[
            { id: "analytics", label: "Báo Cáo & Doanh Thu", icon: BarChart3 },
            {
              id: "bookings",
              label: `Lịch Hẹn (${bookings.length})`,
              icon: Calendar,
            },
            {
              id: "barbers",
              label: `Đội Ngũ Thợ (${barbers.length})`,
              icon: Scissors,
            },
            {
              id: "services",
              label: `Dịch Vụ & Bảng Giá (${services.length})`,
              icon: DollarSign,
            },
            {
              id: "customers",
              label: `Khách Hàng (${customerList.length})`,
              icon: Users,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-amber-400 bg-slate-900 text-gold font-bold shadow-sm"
                    : "border-transparent text-slate-400 hover:text-white hover:bg-slate-950"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: THỐNG KÊ CHI TIẾT DOANH THU                       */}
        {/* ======================================================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Số liệu theo khoảng thời gian đã chọn
              </p>
              <Select
                value={revPeriod}
                onValueChange={(v) => setRevPeriod(v as RevPeriod)}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem
                      key={p.value}
                      value={p.value}
                      className="text-xs"
                    >
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-medium block">
                  Doanh thu hôm nay ({formatDateVN(new Date())})
                </span>
                <span className="text-2xl font-bold text-ok font-mono mt-1 block">
                  {formatVND(analyticsData.todayRev)}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {analyticsData.todayBookingsCount} lượt khách hôm nay
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-medium block">
                  Doanh thu (
                  {PERIOD_OPTIONS.find((p) => p.value === revPeriod)?.label})
                </span>
                <span className="text-2xl font-bold text-gold font-mono mt-1 block">
                  {formatVND(analyticsData.totalRev)}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Từ {analyticsData.totalBookingsCount} lượt đặt lịch
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-medium block">
                  Giá trị đơn trung bình (AOV)
                </span>
                <span className="text-2xl font-bold text-white font-mono mt-1 block">
                  {formatVND(analyticsData.averageOrderValue)}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Trung bình mỗi lượt khách
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                <span className="text-xs text-slate-400 font-medium block">
                  Tỷ lệ hoàn thành ca
                </span>
                <span className="text-2xl font-bold text-info font-mono mt-1 block">
                  {analyticsData.completionRate}%
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Đánh giá hiệu suất phục vụ
                </span>
              </div>
            </div>

            {/* Chi tiết Doanh Thu Theo Từng Thợ Cắt Tóc */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-gold" />
                  Báo Cáo Doanh Thu &amp; Hiệu Suất Theo Từng Thợ
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    value={barberQuery}
                    onChange={(e) => setBarberQuery(e.target.value)}
                    placeholder="Tìm theo tên thợ..."
                    className="pl-9 h-9 text-xs bg-slate-950 border-slate-800"
                  />
                </div>
                <Select
                  value={barberSort}
                  onValueChange={(v) => setBarberSort(v as BarberSortKey)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 sm:w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue" className="text-xs">
                      Doanh thu cao nhất
                    </SelectItem>
                    <SelectItem value="appointments" className="text-xs">
                      Nhiều ca nhất
                    </SelectItem>
                    <SelectItem value="name" className="text-xs">
                      Tên A → Z
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {barberPaging.pageItems.map((item) => (
                  <div
                    key={item.barber.id}
                    className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={item.barber.name}
                          role="barber"
                          size="sm"
                        />
                        <span className="font-bold text-white">
                          {item.barber.name}
                        </span>
                        {item.barber.isLocked && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] py-0"
                          >
                            Đã khóa
                          </Badge>
                        )}
                        <span className="text-slate-400 font-normal">
                          ({item.totalAppointments} ca •{" "}
                          {item.completedAppointments} hoàn thành)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gold font-mono text-sm">
                          {formatVND(item.revenue)}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({item.percentage}% tổng tiệm)
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {barberRows.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  Không có thợ nào khớp tìm kiếm.
                </p>
              )}
              <Pagination
                page={barberPaging.page}
                totalPages={barberPaging.totalPages}
                onPageChange={barberPaging.setPage}
                className="pt-2"
              />
            </div>

            {/* Chi tiết Doanh Thu Theo Từng Dịch Vụ */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gold" />
                  Báo Cáo Doanh Thu Theo Từng Gói Dịch Vụ
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    value={serviceQuery}
                    onChange={(e) => setServiceQuery(e.target.value)}
                    placeholder="Tìm theo tên dịch vụ..."
                    className="pl-9 h-9 text-xs bg-slate-950 border-slate-800"
                  />
                </div>
                <Select
                  value={serviceSort}
                  onValueChange={(v) => setServiceSort(v as ServiceSortKey)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 sm:w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue" className="text-xs">
                      Doanh thu cao nhất
                    </SelectItem>
                    <SelectItem value="count" className="text-xs">
                      Được chọn nhiều nhất
                    </SelectItem>
                    <SelectItem value="name" className="text-xs">
                      Tên A → Z
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {servicePaging.pageItems.map((item) => (
                  <div
                    key={item.service.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs block">
                          {item.service.name}
                        </span>
                        {!item.service.isActive && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] py-0"
                          >
                            Tạm ngưng
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {item.count} lượt chọn • {formatVND(item.service.price)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-ok text-xs block">
                        {formatVND(item.revenue)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Chiếm {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {serviceRows.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  Không có dịch vụ nào khớp tìm kiếm.
                </p>
              )}
              <Pagination
                page={servicePaging.page}
                totalPages={servicePaging.totalPages}
                onPageChange={servicePaging.setPage}
                className="pt-2"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: QUẢN LÝ TOÀN BỘ LỊCH HẸN                          */}
        {/* ======================================================== */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            <div
              ref={bookingListTopRef}
              className="scroll-mt-24 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên khách hàng, số điện thoại..."
                    className="pl-9 h-9 text-xs bg-slate-950 border-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={dateFilter === "all" ? "gold" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("all")}
                    className="h-8 text-xs"
                  >
                    Tất cả ngày
                  </Button>
                  <Button
                    variant={
                      dateFilter === format(new Date(), "yyyy-MM-dd")
                        ? "gold"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setDateFilter(format(new Date(), "yyyy-MM-dd"))
                    }
                    className="h-8 text-xs"
                  >
                    Hôm nay ({formatDateVN(new Date())})
                  </Button>
                  <Input
                    type="date"
                    aria-label="Chọn ngày cụ thể"
                    value={dateFilter === "all" ? "" : dateFilter}
                    onChange={(e) => setDateFilter(e.target.value || "all")}
                    className="h-8 w-[150px] text-xs bg-slate-950 border-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Lọc theo thợ:</span>
                  <Select value={barberFilter} onValueChange={setBarberFilter}>
                    <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 w-[160px]">
                      <SelectValue placeholder="Tất cả thợ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        Tất cả thợ
                      </SelectItem>
                      {barbers.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Trạng thái:</span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 w-[150px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        Tất cả trạng thái
                      </SelectItem>
                      <SelectItem value="pending" className="text-xs text-gold">
                        Chờ xác nhận
                      </SelectItem>
                      <SelectItem value="confirmed" className="text-xs text-ok">
                        Đã xác nhận
                      </SelectItem>
                      <SelectItem
                        value="in_progress"
                        className="text-xs text-live"
                      >
                        Đang phục vụ
                      </SelectItem>
                      <SelectItem
                        value="completed"
                        className="text-xs text-info"
                      >
                        Đã hoàn thành
                      </SelectItem>
                      <SelectItem
                        value="cancelled"
                        className="text-xs text-bad"
                      >
                        Đã hủy
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-slate-500 ml-auto font-mono text-[11px]">
                  Hiển thị {filteredBookings.length} lịch hẹn
                </span>
              </div>
            </div>

            {/* Danh sách lịch hẹn */}
            <div className="space-y-3">
              {filteredBookings.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Không tìm thấy lịch hẹn nào phù hợp với bộ lọc
                </div>
              ) : (
                bookingPaging.pageItems.map((b) => {
                  const barber = barbers.find((brb) => brb.id === b.barberId);

                  return (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {b.customerName}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ({b.customerPhone})
                          </span>
                          <Badge
                            variant={getStatusBadgeVariant(b.status)}
                            className="text-[10px]"
                          >
                            {getStatusLabel(b.status)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span className="font-semibold text-slate-200">
                            {b.services.length > 0
                              ? b.services.map((s) => s.name).join(" + ")
                              : b.serviceName}
                          </span>
                          <span className="font-mono text-gold font-bold">
                            {formatVND(b.price)}
                          </span>
                          <span className="flex items-center gap-1 text-gold font-mono font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            {b.time}–{b.endTime} • Ngày {formatDateVN(b.date)}
                          </span>
                          <span>
                            Thợ:{" "}
                            <strong className="text-slate-300">
                              {barber?.name}
                            </strong>
                          </span>
                        </div>

                        {b.notes && (
                          <p className="text-[11px] text-slate-400 italic">
                            Ghi chú: &ldquo;{b.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Các nút hành động quản trị */}
                      <div className="flex items-center gap-1.5 self-end md:self-center">
                        {b.status === "pending" && (
                          <Button
                            size="sm"
                            variant="emerald"
                            onClick={() =>
                              handleUpdateStatus(b.id, "confirmed")
                            }
                            className="h-7 px-2 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" /> Duyệt
                          </Button>
                        )}

                        {b.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() =>
                              handleUpdateStatus(b.id, "in_progress")
                            }
                            className="h-7 px-2 text-xs"
                          >
                            <Play className="h-3 w-3 mr-1" /> Phục vụ
                          </Button>
                        )}

                        {b.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleUpdateStatus(b.id, "completed")
                            }
                            className="h-7 px-2 text-xs bg-blue-900/40 text-info"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Xong
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingBooking(b);
                            setIsEditModalOpen(true);
                          }}
                          className="h-7 px-2 text-xs border-slate-700 hover:border-amber-400"
                        >
                          <Edit2 className="h-3 w-3 mr-1" /> Sửa
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBooking(b.id)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-bad"
                          title="Xóa lịch hẹn"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Pagination
              page={bookingPaging.page}
              totalPages={bookingPaging.totalPages}
              onPageChange={(p) => {
                bookingPaging.setPage(p);
                scrollToBookingTop();
              }}
              className="pt-2"
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: QUẢN LÝ ĐỘI NGŨ THỢ (THÊM / SỬA / KHÓA / XÓA)      */}
        {/* ======================================================== */}
        {activeTab === "barbers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Quản lý hồ sơ, quyền hạn và trạng thái làm việc của các thợ cắt
                tóc
              </span>
              <Button
                variant="gold"
                size="sm"
                onClick={handleOpenAddBarber}
                className="text-xs font-semibold gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Thêm Thợ Mới
              </Button>
            </div>

            <div
              ref={barberTabTopRef}
              className="scroll-mt-24 flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={barberTabQuery}
                  onChange={(e) => setBarberTabQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc số điện thoại thợ..."
                  className="pl-9 h-9 text-xs bg-slate-950 border-slate-800"
                />
              </div>
              <Select
                value={barberTabStatus}
                onValueChange={(v) =>
                  setBarberTabStatus(v as "all" | "active" | "locked")
                }
              >
                <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Tất cả trạng thái
                  </SelectItem>
                  <SelectItem value="active" className="text-xs text-ok">
                    Đang hoạt động
                  </SelectItem>
                  <SelectItem value="locked" className="text-xs text-bad">
                    Đã khóa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {barberTabPaging.pageItems.map((b) => {
                const bBookings = bookings.filter(
                  (bk) => bk.barberId === b.id && bk.status !== "cancelled",
                );
                const bCompleted = bBookings.filter(
                  (bk) => bk.status === "completed",
                ).length;
                const bRev = bBookings.reduce((sum, bk) => sum + bk.price, 0);

                return (
                  <div
                    key={b.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      b.isLocked
                        ? "bg-slate-950/70 border-rose-900/50 opacity-75"
                        : "bg-slate-900/80 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={b.name} role="barber" size="lg" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-white text-sm">
                              {b.name}
                            </h4>
                            {b.isLocked && (
                              <Badge
                                variant="destructive"
                                className="text-[9px] py-0 px-1"
                              >
                                Đã khóa
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gold">{b.specialty}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {b.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-2 line-clamp-2">
                      {b.bio}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="bg-slate-950 p-2 rounded-lg text-center border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">
                          Đã hoàn thành
                        </span>
                        <span className="font-bold text-white text-xs">
                          {bCompleted} ca
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg text-center border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">
                          Doanh thu tạo ra
                        </span>
                        <span className="font-bold text-ok font-mono text-xs">
                          {formatVND(bRev)}
                        </span>
                      </div>
                    </div>

                    {/* HÀNH ĐỘNG: SỬA / KHÓA / XÓA THỢ */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditBarber(b)}
                        className="h-7 text-xs border-slate-700 flex-1 hover:border-amber-400"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Sửa
                      </Button>

                      <Button
                        variant={b.isLocked ? "emerald" : "outline"}
                        size="sm"
                        onClick={() => handleToggleLockBarber(b)}
                        className={`h-7 text-xs flex-1 ${
                          b.isLocked
                            ? "bg-emerald-600 text-[#fff]"
                            : "border-slate-700 text-slate-300 hover:text-gold hover:border-amber-500/50"
                        }`}
                        title={
                          b.isLocked ? "Mở khóa thợ" : "Khóa tài khoản thợ"
                        }
                      >
                        {b.isLocked ? (
                          <>
                            <Unlock className="h-3 w-3 mr-1" /> Mở khóa
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" /> Khóa
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBarber(b)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-bad hover:bg-rose-500/10"
                        title="Xóa thợ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {barberTabRows.length === 0 && (
              <div className="p-8 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Không tìm thấy thợ nào phù hợp với bộ lọc
              </div>
            )}
            <Pagination
              page={barberTabPaging.page}
              totalPages={barberTabPaging.totalPages}
              onPageChange={(p) => {
                barberTabPaging.setPage(p);
                barberTabTopRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className="pt-2"
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: QUẢN LÝ DỊCH VỤ & BẢNG GIÁ (THÊM / SỬA / KHÓA / XÓA) */}
        {/* ======================================================== */}
        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Toàn bộ danh mục dịch vụ phục vụ khách hàng của salon
              </span>
              <Button
                variant="gold"
                size="sm"
                onClick={handleOpenAddService}
                className="text-xs font-semibold gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Thêm Dịch Vụ Mới
              </Button>
            </div>

            <div
              ref={svcTabTopRef}
              className="scroll-mt-24 flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={svcTabQuery}
                  onChange={(e) => setSvcTabQuery(e.target.value)}
                  placeholder="Tìm theo tên dịch vụ..."
                  className="pl-9 h-9 text-xs bg-slate-950 border-slate-800"
                />
              </div>
              <Select
                value={svcTabStatus}
                onValueChange={(v) =>
                  setSvcTabStatus(v as "all" | "active" | "paused")
                }
              >
                <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Tất cả trạng thái
                  </SelectItem>
                  <SelectItem value="active" className="text-xs text-ok">
                    Đang phục vụ
                  </SelectItem>
                  <SelectItem value="paused" className="text-xs text-bad">
                    Tạm ngưng
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {svcTabPaging.pageItems.map((srv) => (
                <div
                  key={srv.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    !srv.isActive
                      ? "bg-slate-950/70 border-rose-900/50 opacity-75"
                      : "bg-slate-900/80 border-slate-800"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {srv.name}
                        </span>
                        {srv.popular && (
                          <Badge variant="gold" className="text-[10px] py-0">
                            Ưa chuộng
                          </Badge>
                        )}
                        {!srv.isActive && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] py-0"
                          >
                            Tạm ngưng
                          </Badge>
                        )}
                      </div>
                      <span className="text-base font-bold text-ok font-mono">
                        {formatVND(srv.price)}
                      </span>
                    </div>

                    <p className="text-xs text-gold font-medium">
                      {srv.tagline}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {srv.description}
                    </p>
                    <span className="text-[11px] text-slate-500 block pt-0.5">
                      Thời lượng: {srv.durationMinutes} phút
                    </span>
                  </div>

                  {/* CÁC NÚT THAO TÁC: SỬA / TẠM NGƯNG / XÓA DỊCH VỤ */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditService(srv)}
                      className="h-7 text-xs border-slate-700 flex-1 hover:border-amber-400"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Sửa chi tiết
                    </Button>

                    <Button
                      variant={!srv.isActive ? "emerald" : "outline"}
                      size="sm"
                      onClick={() => handleToggleLockService(srv)}
                      className={`h-7 text-xs flex-1 ${
                        !srv.isActive
                          ? "bg-emerald-600 text-[#fff]"
                          : "border-slate-700 text-slate-300 hover:text-gold"
                      }`}
                    >
                      {!srv.isActive ? (
                        <>
                          <Unlock className="h-3 w-3 mr-1" /> Mở lại
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3 mr-1" /> Tạm ngưng
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteService(srv)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-bad hover:bg-rose-500/10"
                      title="Xóa dịch vụ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {svcTabRows.length === 0 && (
              <div className="p-8 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Không tìm thấy dịch vụ nào phù hợp với bộ lọc
              </div>
            )}
            <Pagination
              page={svcTabPaging.page}
              totalPages={svcTabPaging.totalPages}
              onPageChange={(p) => {
                svcTabPaging.setPage(p);
                svcTabTopRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className="pt-2"
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: QUẢN LÝ KHÁCH HÀNG (THÊM / SỬA / KHÓA / XÓA)      */}
        {/* ======================================================== */}
        {activeTab === "customers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Danh sách khách hàng đã đăng ký tài khoản trên hệ thống
              </span>
              <Button
                variant="gold"
                size="sm"
                onClick={handleOpenAddCustomer}
                className="text-xs font-semibold gap-1.5"
              >
                <UserPlus className="h-4 w-4" />
                Thêm Khách Hàng
              </Button>
            </div>

            <div
              ref={custTabTopRef}
              className="scroll-mt-24 flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={custTabQuery}
                  onChange={(e) => setCustTabQuery(e.target.value)}
                  placeholder="Tìm theo tên, email hoặc số điện thoại..."
                  className="pl-9 h-9 text-xs bg-slate-950 border-slate-800"
                />
              </div>
              <Select
                value={custTabStatus}
                onValueChange={(v) =>
                  setCustTabStatus(v as "all" | "active" | "locked")
                }
              >
                <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Tất cả trạng thái
                  </SelectItem>
                  <SelectItem value="active" className="text-xs text-ok">
                    Đang hoạt động
                  </SelectItem>
                  <SelectItem value="locked" className="text-xs text-bad">
                    Đã khóa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {custTabPaging.pageItems.map((cust) => (
                <div
                  key={cust.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
                    cust.isLocked
                      ? "bg-slate-950/70 border-rose-900/50 opacity-75"
                      : "bg-slate-900/80 border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={cust.name} role="customer" size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {cust.name}
                        </span>
                        {cust.isLocked && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] py-0 px-1"
                          >
                            Bị khóa
                          </Badge>
                        )}
                        {cust.isEmailVerified ? (
                          <Badge
                            variant="confirmed"
                            className="text-[10px] py-0"
                          >
                            Email đã xác thực
                          </Badge>
                        ) : (
                          <Badge variant="pending" className="text-[10px] py-0">
                            Chưa xác thực
                          </Badge>
                        )}
                      </div>
                      <span className="text-slate-400 block font-mono">
                        {cust.email} • SĐT: {cust.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 md:text-right">
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Số lần đặt
                      </span>
                      <span className="font-bold text-white">
                        {cust.bookingCount} lần
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Tổng chi tiêu
                      </span>
                      <span className="font-bold text-ok font-mono">
                        {formatVND(cust.totalSpent)}
                      </span>
                    </div>

                    {/* HÀNH ĐỘNG: SỬA / KHÓA / XÓA KHÁCH HÀNG */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditCustomer(cust)}
                        className="h-7 px-2.5 text-xs border-slate-700 hover:border-amber-400"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Sửa
                      </Button>

                      <Button
                        variant={cust.isLocked ? "emerald" : "outline"}
                        size="sm"
                        onClick={() => handleToggleLockCustomer(cust)}
                        className={`h-7 px-2.5 text-xs ${
                          cust.isLocked
                            ? "bg-emerald-600 text-[#fff]"
                            : "border-slate-700 text-slate-300 hover:text-gold"
                        }`}
                        title={
                          cust.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"
                        }
                      >
                        {cust.isLocked ? (
                          <>
                            <Unlock className="h-3 w-3 mr-1" /> Mở
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" /> Khóa
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomer(cust)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-bad hover:bg-rose-500/10"
                        title="Xóa khách hàng"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {custTabRows.length === 0 && (
              <div className="p-8 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Không tìm thấy khách hàng nào phù hợp với bộ lọc
              </div>
            )}
            <Pagination
              page={custTabPaging.page}
              totalPages={custTabPaging.totalPages}
              onPageChange={(p) => {
                custTabPaging.setPage(p);
                custTabTopRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className="pt-2"
            />
          </div>
        )}
      </main>

      <Footer />

      {/* MODAL SỬA LỊCH HẸN (kiểm tra ca làm + chống trùng giờ) */}
      <EditBookingModal
        booking={editingBooking}
        isOpen={isEditModalOpen}
        barbers={barbers}
        services={services}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBooking(null);
        }}
        onSuccess={() => void reload()}
      />

      {/* MODAL THÊM / SỬA TÀI KHOẢN THỢ HOẶC KHÁCH */}
      <Dialog
        open={userModal.open}
        onOpenChange={(open) => !open && closeUserModal()}
      >
        <DialogContent className="max-w-md border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              {isBarberModal ? (
                <Scissors className="h-4 w-4 text-gold" />
              ) : (
                <Users className="h-4 w-4 text-gold" />
              )}
              {userModal.editing
                ? isBarberModal
                  ? "Chỉnh Sửa Thông Tin Thợ Cắt Tóc"
                  : "Chỉnh Sửa Khách Hàng"
                : isBarberModal
                  ? "Thêm Thợ Cắt Tóc Mới"
                  : "Thêm Khách Hàng Mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Họ và tên *</Label>
              <Input
                value={uName}
                onChange={(e) => setUName(e.target.value)}
                placeholder={
                  isBarberModal ? "Ví dụ: Lê Hoàng Long" : "Nguyễn Văn An"
                }
                className={`h-8 text-xs bg-slate-800 border-slate-700 ${errorRing(userErrors.fullName)}`}
              />
              <FieldError message={userErrors.fullName} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">
                  Số điện thoại *
                </Label>
                <Input
                  value={uPhone}
                  onChange={(e) => setUPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className={`h-8 text-xs bg-slate-800 border-slate-700 ${errorRing(userErrors.phone)}`}
                />
                <FieldError message={userErrors.phone} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Email *</Label>
                <Input
                  type="email"
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  disabled={!!userModal.editing}
                  placeholder={
                    isBarberModal ? "tho@vanguard.vn" : "an.nguyen@gmail.com"
                  }
                  className={`h-8 text-xs bg-slate-800 border-slate-700 disabled:opacity-60 ${errorRing(userErrors.email)}`}
                />
                <FieldError message={userErrors.email} />
              </div>
            </div>

            {!userModal.editing && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">
                  Mật khẩu khởi tạo *
                </Label>
                <PasswordInput
                  autoComplete="new-password"
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className={`h-8 text-xs bg-slate-800 border-slate-700 ${errorRing(userErrors.password)}`}
                />
                <FieldError message={userErrors.password} />
              </div>
            )}

            {isBarberModal && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    Chuyên môn / Kỹ năng nổi bật
                  </Label>
                  <Input
                    value={uSpecialty}
                    onChange={(e) => setUSpecialty(e.target.value)}
                    placeholder="Ví dụ: Chuyên Fade & Tỉa tầng textured"
                    className="h-8 text-xs bg-slate-800 border-slate-700"
                  />
                  <FieldError message={userErrors.specialty} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    Giới thiệu tay nghề
                  </Label>
                  <textarea
                    value={uBio}
                    onChange={(e) => setUBio(e.target.value)}
                    rows={2}
                    placeholder="Kinh nghiệm, giải thưởng, phong cách cắt..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <FieldError message={userErrors.bio} />
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeUserModal}
                className="text-xs border-slate-700"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                disabled={saving}
                className="text-xs"
              >
                {saving
                  ? "Đang lưu..."
                  : userModal.editing
                    ? "Lưu thay đổi"
                    : isBarberModal
                      ? "Thêm thợ"
                      : "Tạo khách hàng"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL THÊM / SỬA DỊCH VỤ */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="max-w-md border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gold" />
              {editingService ? "Chỉnh Sửa Dịch Vụ" : "Thêm Dịch Vụ Mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveService} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Tên dịch vụ *</Label>
              <Input
                value={srvName}
                onChange={(e) => setSrvName(e.target.value)}
                placeholder="Ví dụ: Uốn phồng nam Textured"
                className={`h-8 text-xs bg-slate-800 border-slate-700 ${errorRing(srvErrors.name)}`}
              />
              <FieldError message={srvErrors.name} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">
                Mô tả ngắn (Tagline)
              </Label>
              <Input
                value={srvTagline}
                onChange={(e) => setSrvTagline(e.target.value)}
                placeholder="Ví dụ: Tạo độ bồng bềnh tự nhiên cho tóc"
                className={`h-8 text-xs bg-slate-800 border-slate-700 ${errorRing(srvErrors.tagline)}`}
              />
              <FieldError message={srvErrors.tagline} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">
                  Giá niêm yết (VNĐ) *
                </Label>
                <Input
                  type="number"
                  value={srvPrice}
                  onChange={(e) => setSrvPrice(e.target.value)}
                  placeholder="250000"
                  className={`h-8 text-xs bg-slate-800 border-slate-700 ${errorRing(srvErrors.price)}`}
                />
                <FieldError message={srvErrors.price} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">
                  Thời lượng (phút) *
                </Label>
                <Input
                  type="number"
                  value={srvDuration}
                  onChange={(e) => setSrvDuration(e.target.value)}
                  placeholder="45"
                  className={`h-8 text-xs bg-slate-800 border-slate-700 ${errorRing(srvErrors.durationMinutes)}`}
                />
                <FieldError message={srvErrors.durationMinutes} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Chi tiết dịch vụ</Label>
              <textarea
                value={srvDesc}
                onChange={(e) => setSrvDesc(e.target.value)}
                rows={2}
                placeholder="Các bước chăm sóc trong gói..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <FieldError message={srvErrors.description} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="popular"
                checked={srvPopular}
                onChange={(e) => setSrvPopular(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-400"
              />
              <Label
                htmlFor="popular"
                className="text-xs text-slate-300 cursor-pointer"
              >
                Đánh dấu là gói dịch vụ &ldquo;Ưa chuộng&rdquo;
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsServiceModalOpen(false)}
                className="text-xs border-slate-700"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                disabled={saving}
                className="text-xs"
              >
                {saving
                  ? "Đang lưu..."
                  : editingService
                    ? "Lưu thay đổi"
                    : "Lưu dịch vụ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* HỘP XÁC NHẬN DÙNG CHUNG */}
      {confirmDialog}
    </div>
  );
}
