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
    fetch("/api/admin/tables")
      .then((res) => res.json())
      .then((data) => {
        setTables(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-orange-500";
      case "available":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "occupied":
        return "Đang có khách";
      case "available":
        return "Trống";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🍽️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Nhà Hàng</h1>
          <p className="text-orange-100 mt-1">Chào mừng quý khách</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Chọn bàn của bạn
            </h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-500 mt-3">Đang tải...</p>
              </div>
            ) : tables.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl">🪑</span>
                <p className="text-gray-500 mt-2">Chưa có bàn nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => router.push(`/table/${table.number}`)}
                    className="bg-gray-50 hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-400 rounded-2xl p-4 transition-all flex flex-col items-center gap-2"
                  >
                    <div className="relative">
                      <span className="text-3xl">🪑</span>
                      <div
                        className={`absolute -top-1 -right-1 w-3 h-3 ${getStatusColor(
                          table.status
                        )} rounded-full`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-800">{table.name}</p>
                      <p className="text-xs text-gray-500">{getStatusText(table.status)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => router.push("/admin/login")}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors"
            >
              👨‍💼 Quản trị
            </button>
            <button
              onClick={() => router.push("/server/login")}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors"
            >
              🍜 Phục vụ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
