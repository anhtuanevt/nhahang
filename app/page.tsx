"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Table {
  id: string;
  number: number;
  name: string;
  status: string;
}

export default function Home() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/tables")
      .then((res) => res.json())
      .then((data) => {
        setTables(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "occupied":
        return { dot: "bg-orange-400", label: "Đang có khách", card: "bg-orange-50 border-orange-200" };
      case "available":
        return { dot: "bg-emerald-400", label: "Trống", card: "bg-white border-gray-200" };
      default:
        return { dot: "bg-gray-300", label: status, card: "bg-white border-gray-200" };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-60 h-60 bg-orange-300/20 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-10">
        {/* Hero section */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-5 ring-4 ring-white/30">
            <span className="text-5xl">🍽️</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Nhà Hàng</h1>
          <p className="text-orange-100 mt-2 text-base">Chào mừng quý khách</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Main card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-white/50 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Chọn bàn của bạn</h2>
              {!loading && tables.length > 0 && (
                <p className="text-sm text-gray-400 mt-0.5">{tables.length} bàn</p>
              )}
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-gray-400 mt-4 text-sm font-medium">Đang tải...</p>
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">🪑</span>
                  </div>
                  <p className="text-gray-500 font-medium">Chưa có bàn nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {tables.map((table) => {
                    const cfg = getStatusConfig(table.status);
                    return (
                      <button
                        key={table.id}
                        onClick={() => router.push(`/table/${table.number}`)}
                        className={`relative border-2 ${cfg.card} hover:border-orange-400 hover:bg-orange-50 rounded-2xl p-4 transition-all duration-200 flex flex-col items-center gap-2.5 group active:scale-95`}
                      >
                        <div className="relative">
                          <div className="w-12 h-12 bg-gray-100 group-hover:bg-orange-100 rounded-2xl flex items-center justify-center text-2xl transition-colors duration-200">
                            🪑
                          </div>
                          <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 ${cfg.dot} rounded-full border-2 border-white shadow-sm`} />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-gray-800 text-sm leading-tight group-hover:text-orange-600 transition-colors">
                            {table.name || `Bàn ${table.number}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{cfg.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom nav links */}
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push("/admin/login")}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-2xl text-sm font-semibold transition-all duration-200 border border-white/20 hover:border-white/40 min-h-[44px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Quản trị
            </button>
            <button
              onClick={() => router.push("/server/login")}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-2xl text-sm font-semibold transition-all duration-200 border border-white/20 hover:border-white/40 min-h-[44px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
              </svg>
              Phục vụ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
