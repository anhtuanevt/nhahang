"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/app/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/utils";

interface MenuItemData { id: string; name: string; price: number; }
interface OrderItem { id: string; quantity: number; priceAtOrder: number; menuItem: MenuItemData; }
interface Order { id: string; status: string; calledAt: string; items: OrderItem[]; }
interface TableData { id: string; number: number; name: string | null; }
interface Session { id: string; status: string; startedAt: string; endedAt: string | null; table: TableData; orders: Order[]; }

function toYMD(date: Date): string { return date.toISOString().slice(0, 10); }
function sessionTotal(s: Session) { return s.orders.flatMap((o) => o.items).reduce((sum, i) => sum + i.priceAtOrder * i.quantity, 0); }
function orderTotal(o: Order) { return o.items.reduce((sum, i) => sum + i.priceAtOrder * i.quantity, 0); }

export default function HistoryPage() {
  const router = useRouter();
  const [date, setDate] = useState(toYMD(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function fetchHistory(d: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/history?date=${d}`, { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) { setError("Không thể tải lịch sử"); return; }
      setSessions(await res.json());
    } catch { setError("Lỗi kết nối"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchHistory(date); }, [date]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function deleteSession(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/history/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { setSessions((prev) => prev.filter((s) => s.id !== id)); }
    } finally { setDeletingId(null); setConfirmId(null); }
  }

  const totalRevenue = sessions.reduce((sum, s) => sum + sessionTotal(s), 0);
  const totalItems = sessions.flatMap((s) => s.orders.flatMap((o) => o.items)).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Xem và quản lý đơn hàng theo ngày</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 shrink-0">Ngày:</label>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 w-full sm:w-auto"
          />
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Summary */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { icon: "📋", label: "Số phiên", value: sessions.length, gradient: "from-orange-500 to-orange-600", textColor: "text-gray-900" },
                { icon: "🍽️", label: "Tổng món đã gọi", value: totalItems, gradient: "from-blue-500 to-blue-600", textColor: "text-gray-900" },
                { icon: "💰", label: "Tổng doanh thu", value: formatPrice(totalRevenue), gradient: "from-emerald-500 to-green-600", textColor: "text-emerald-700" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
                  <div className={`w-11 h-11 bg-gradient-to-br ${s.gradient} rounded-2xl flex items-center justify-center text-xl text-white shrink-0`}>{s.icon}</div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">{s.label}</p>
                    <p className={`text-xl font-bold ${s.textColor} mt-0.5`}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Session list */}
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl shadow-sm">
              Không có đơn hàng nào trong ngày này
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const expanded = expandedIds.has(session.id);
                const total = sessionTotal(session);
                const itemCount = session.orders.flatMap((o) => o.items).reduce((s, i) => s + i.quantity, 0);
                return (
                  <div key={session.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    {/* Session header */}
                    <div className="flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4">
                      <button className="flex-1 text-left flex items-center justify-between gap-2 min-w-0" onClick={() => toggleExpand(session.id)}>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                          <span className="font-semibold text-gray-900">
                            Bàn {session.table.number}
                            {session.table.name && <span className="text-gray-500 font-normal ml-1 text-sm">({session.table.name})</span>}
                          </span>
                          <Badge status={session.status} />
                          <span className="text-sm text-gray-500 hidden sm:inline">{formatDate(session.startedAt)}{session.endedAt && ` → ${formatDate(session.endedAt)}`}</span>
                          <span className="text-sm text-gray-500">{itemCount} món</span>
                          <span className="text-sm font-semibold text-orange-600">{formatPrice(total)}</span>
                        </div>
                        <span className="text-gray-400 shrink-0">{expanded ? "▲" : "▼"}</span>
                      </button>

                      {/* Delete button */}
                      {confirmId === session.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => deleteSession(session.id)}
                            disabled={deletingId === session.id}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                          >
                            {deletingId === session.id ? "..." : "Xóa"}
                          </button>
                          <button onClick={() => setConfirmId(null)} className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">Hủy</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(session.id)}
                          className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa phiên này"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Expanded orders */}
                    {expanded && (
                      <div className="border-t border-gray-100 px-4 py-4 sm:px-6 space-y-3">
                        {session.orders.length === 0 ? (
                          <p className="text-sm text-gray-400">Chưa có đơn hàng</p>
                        ) : (
                          session.orders.map((order, idx) => (
                            <div key={order.id} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="text-sm font-medium text-gray-700">Đơn #{idx + 1}</span>
                                <Badge status={order.status} />
                                <span className="text-xs text-gray-400">{formatDate(order.calledAt)}</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[280px]">
                                  <thead>
                                    <tr className="text-xs text-gray-500 uppercase">
                                      <th className="text-left pb-2">Món</th>
                                      <th className="text-center pb-2 w-10">SL</th>
                                      <th className="text-right pb-2 hidden sm:table-cell">Đơn giá</th>
                                      <th className="text-right pb-2">Tiền</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {order.items.map((item) => (
                                      <tr key={item.id}>
                                        <td className="py-1.5 text-gray-800">{item.menuItem.name}</td>
                                        <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                                        <td className="py-1.5 text-right text-gray-600 hidden sm:table-cell">{formatPrice(item.priceAtOrder)}</td>
                                        <td className="py-1.5 text-right font-medium">{formatPrice(item.priceAtOrder * item.quantity)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-gray-200">
                                      <td colSpan={2} className="pt-2 text-right text-xs text-gray-500 sm:hidden">Tổng:</td>
                                      <td colSpan={3} className="pt-2 text-right text-xs text-gray-500 hidden sm:table-cell">Tổng đơn:</td>
                                      <td className="pt-2 text-right font-bold text-orange-600">{formatPrice(orderTotal(order))}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          ))
                        )}
                        {session.orders.length > 0 && (
                          <div className="text-right text-sm font-bold text-gray-700">
                            Tổng phiên: <span className="text-orange-600 text-base">{formatPrice(total)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
