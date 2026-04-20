"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TableData {
  id: string;
  number: number;
  name: string | null;
  status: string;
  sessions: Array<{ status: string }>;
}

interface MenuItem {
  id: string;
  available: boolean;
}

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [tablesRes, menuRes] = await Promise.all([
          fetch("/api/admin/tables", { credentials: "include" }),
          fetch("/api/admin/menu", { credentials: "include" }),
        ]);

        if (tablesRes.status === 401 || menuRes.status === 401) {
          router.push("/admin/login");
          return;
        }

        if (!tablesRes.ok || !menuRes.ok) {
          setError("Không thể tải dữ liệu");
          return;
        }

        const tablesData = await tablesRes.json();
        const menuData = await menuRes.json();
        setTables(tablesData);
        setMenuItems(menuData);
      } catch {
        setError("Lỗi kết nối");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => {
    const activeSession = t.sessions?.find((s: { status: string }) => s.status === "active");
    return !!activeSession;
  }).length;
  const paymentTables = tables.filter((t) => (t as any).status === "payment_requested").length;
  const totalMenuItems = menuItems.length;

  const stats: StatCard[] = [
    { label: "Tổng số bàn", value: totalTables, icon: "🪑", color: "bg-blue-50 text-blue-600" },
    { label: "Bàn đang dùng", value: occupiedTables, icon: "🔴", color: "bg-red-50 text-red-600" },
    { label: "Yêu cầu thanh toán", value: paymentTables, icon: "💳", color: "bg-yellow-50 text-yellow-600" },
    { label: "Tổng món ăn", value: totalMenuItems, icon: "🍽️", color: "bg-green-50 text-green-600" },
  ];

  const quickLinks = [
    { href: "/admin/menu", label: "Quản lý thực đơn", icon: "🍽️", desc: "Thêm, sửa, xóa món ăn" },
    { href: "/admin/tables", label: "Quản lý bàn", icon: "🪑", desc: "Thêm bàn, xem QR code" },
    { href: "/admin/history", label: "Lịch sử đơn hàng", icon: "📋", desc: "Xem đơn hàng theo ngày" },
    { href: "/admin/settings", label: "Cài đặt", icon: "⚙️", desc: "Tên nhà hàng và cấu hình" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tổng quan hệ thống nhà hàng</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Truy cập nhanh</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md hover:border-orange-200 border border-transparent transition-all group"
          >
            <div className="text-3xl mb-3">{link.icon}</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
              {link.label}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
