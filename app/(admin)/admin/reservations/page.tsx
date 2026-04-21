"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Reservation {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  note: string | null;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "Đã xác nhận", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Đã huỷ", color: "bg-red-100 text-red-600 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  async function fetchReservations() {
    try {
      const res = await fetch("/api/admin/reservations", { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (res.ok) setReservations(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReservations(); }, []);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      }
    } finally {
      setUpdating(null);
    }
  }

  async function deleteReservation(id: string) {
    if (!confirm("Xoá đặt bàn này?")) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/reservations/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setReservations((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setUpdating(null);
    }
  }

  const filtered = filter === "all" ? reservations : reservations.filter((r) => r.status === filter);
  const counts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.status === "pending").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Đặt bàn trước</h1>
        <p className="text-sm text-gray-500 mt-0.5">Quản lý yêu cầu đặt bàn từ khách hàng</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {f === "all" ? "Tất cả" : STATUS_CONFIG[f].label}
            <span className={`ml-1.5 text-xs font-bold ${filter === f ? "text-orange-100" : "text-gray-400"}`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          Không có đặt bàn nào
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{r.name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">📞</span>
                      <span className="font-medium">{r.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">📅</span>
                      <span>{r.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">🕐</span>
                      <span>{r.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">👥</span>
                      <span>{r.guests} người</span>
                    </div>
                  </div>
                  {r.note && (
                    <p className="mt-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 italic">
                      "{r.note}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(r.id, "confirmed")}
                        disabled={updating === r.id}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium transition-colors"
                      >
                        Xác nhận
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "cancelled")}
                        disabled={updating === r.id}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-50 font-medium transition-colors"
                      >
                        Huỷ
                      </button>
                    </>
                  )}
                  {r.status !== "pending" && (
                    <button
                      onClick={() => updateStatus(r.id, "pending")}
                      disabled={updating === r.id}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors"
                    >
                      Đặt lại
                    </button>
                  )}
                  <button
                    onClick={() => deleteReservation(r.id)}
                    disabled={updating === r.id}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
