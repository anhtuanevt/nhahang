"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/menu", label: "Thực đơn", icon: "🍽️" },
  { href: "/admin/tables", label: "Quản lý bàn", icon: "🪑" },
  { href: "/admin/history", label: "Lịch sử", icon: "📋" },
  { href: "/admin/report", label: "Báo cáo", icon: "📊" },
  { href: "/admin/feedback", label: "Feedback", icon: "💬" },
  { href: "/admin/settings", label: "Cài đặt", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === "/admin/login") return <>{children}</>;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/admin/login");
    }
  }

  const currentLabel = NAV_ITEMS.find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
  )?.label ?? "Admin";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-white shadow-lg flex flex-col transition-transform duration-300",
          "md:static md:translate-x-0 md:shadow-sm",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-lg font-bold text-orange-500">🍜 Nhà Hàng Admin</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600 p-1"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <span className="text-base">🚪</span>
            {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Mở menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-800">{currentLabel}</span>
        </div>

        {children}
      </main>
    </div>
  );
}
