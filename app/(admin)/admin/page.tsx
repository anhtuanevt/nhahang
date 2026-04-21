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
  icon: React.ReactNode;
  gradient: string;
  textColor: string;
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
    {
      label: "Tổng số bàn",
      value: totalTables,
      gradient: "from-blue-500 to-blue-600",
      textColor: "text-blue-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      label: "Bàn đang dùng",
      value: occupiedTables,
      gradient: "from-orange-500 to-orange-600",
      textColor: "text-orange-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Yêu cầu thanh toán",
      value: paymentTables,
      gradient: "from-amber-500 to-yellow-500",
      textColor: "text-amber-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      label: "Tổng món ăn",
      value: totalMenuItems,
      gradient: "from-emerald-500 to-green-600",
      textColor: "text-emerald-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  const quickLinks = [
    {
      href: "/admin/menu",
      label: "Quản lý thực đơn",
      desc: "Thêm, sửa, xóa món ăn",
      gradient: "from-orange-50 to-amber-50",
      border: "border-orange-100",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      href: "/admin/tables",
      label: "Quản lý bàn",
      desc: "Thêm bàn, xem QR code",
      gradient: "from-blue-50 to-indigo-50",
      border: "border-blue-100",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      href: "/admin/history",
      label: "Lịch sử đơn hàng",
      desc: "Xem đơn hàng theo ngày",
      gradient: "from-purple-50 to-violet-50",
      border: "border-purple-100",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/admin/settings",
      label: "Cài đặt",
      desc: "Tên nhà hàng và cấu hình",
      gradient: "from-gray-50 to-slate-50",
      border: "border-gray-200",
      iconBg: "bg-gray-100",
      iconColor: "text-gray-500",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
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
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-sm font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1 font-medium">Tổng quan hệ thống nhà hàng</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} bg-opacity-10 flex items-center justify-center text-white`}
              style={{ background: undefined }}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${stat.gradient}`}>
                <span className="text-white">{stat.icon}</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium leading-tight truncate">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mb-5">
        <h2 className="text-base font-bold text-gray-800">Truy cập nhanh</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`bg-gradient-to-br ${link.gradient} border ${link.border} rounded-2xl p-5 hover:shadow-md transition-all duration-200 group`}
          >
            <div className={`w-12 h-12 ${link.iconBg} ${link.iconColor} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
              {link.icon}
            </div>
            <h3 className="font-bold text-gray-900 text-sm group-hover:text-orange-600 transition-colors duration-200">
              {link.label}
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
