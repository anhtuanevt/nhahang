"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/app/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/utils";

interface MenuItemData {
  id: string;
  name: string;
  price: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: number;
  menuItem: MenuItemData;
}

interface Order {
  id: string;
  status: string;
  calledAt: string;
  items: OrderItem[];
}

interface TableData {
  id: string;
  number: number;
  name: string | null;
}

interface Session {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  table: TableData;
  orders: Order[];
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sessionTotal(session: Session): number {
  return session.orders.flatMap((o) => o.items).reduce((sum, i) => sum + (i.priceAtOrder ?? 0) * i.quantity, 0);
}

function orderTotal(order: Order): number {
  return order.items.reduce((sum, i) => sum + (i.priceAtOrder ?? 0) * i.quantity, 0);
}

export default function HistoryPage() {
  const router = useRouter();
  const [date, setDate] = useState(toYMD(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  async function fetchHistory(d: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/history?date=${d}`, { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) { setError("Không thể tải lịch sử"); return; }
      setSessions(await res.json());
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchHistory(date); }, [date]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalRevenue = sessions.reduce((sum, s) => sum + sessionTotal(s), 0);
  const totalItems = sessions.flatMap((s) => s.orders.flatMap((o) => o.items)).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Xem đơn hàng theo ngày</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Ngày:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Summary */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-xl">📋</div>
                <div>
                  <p className="text-sm text-gray-500">Số phiên</p>
                  <p className="text-xl font-bold text-gray-900">{sessions.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🍽️</div>
                <div>
                  <p className="text-sm text-gray-500">Tổng món đã gọi</p>
                  <p className="text-xl font-bold text-gray-900">{totalItems}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-xl">💰</div>
                <div>
                  <p className="text-sm text-gray-500">Tổng doanh thu</p>
                  <p className="text-xl font-bold text-green-700">{formatPrice(totalRevenue)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Session list */}
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl shadow-sm">
              Không có đơn hàng nào trong ngày này
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const expanded = expandedIds.has(session.id);
                const total = sessionTotal(session);
                const itemCount = session.orders.flatMap((o) => o.items).reduce((s, i) => s + i.quantity, 0);
                return (
                  <div key={session.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* Session header */}
                    <button
                      className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpand(session.id)}
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="font-semibold text-gray-900">
                          Bàn {session.table.number}
                          {session.table.name && (
                            <span className="text-gray-500 font-normal ml-1">({session.table.name})</span>
                          )}
                        </div>
                        <Badge status={session.status} />
                        <div className="text-sm text-gray-500">
                          {formatDate(session.startedAt)}
                          {session.endedAt && ` → ${formatDate(session.endedAt)}`}
                        </div>
                        <div className="text-sm text-gray-500">{itemCount} món</div>
                        <div className="text-sm font-semibold text-orange-600">{formatPrice(total)}</div>
                      </div>
                      <span className="text-gray-400 text-lg">{expanded ? "▲" : "▼"}</span>
                    </button>

                    {/* Expanded orders */}
                    {expanded && (
                      <div className="border-t border-gray-100 px-6 py-4 space-y-4">
                        {session.orders.length === 0 ? (
                          <p className="text-sm text-gray-400">Chưa có đơn hàng</p>
                        ) : (
                          session.orders.map((order, idx) => (
                            <div key={order.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-sm font-medium text-gray-700">
                                  Đơn #{idx + 1}
                                </span>
                                <Badge status={order.status} />
                                <span className="text-xs text-gray-400">{formatDate(order.calledAt)}</span>
                              </div>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 uppercase">
                                    <th className="text-left pb-2">Món</th>
                                    <th className="text-center pb-2">SL</th>
                                    <th className="text-right pb-2">Đơn giá</th>
                                    <th className="text-right pb-2">Thành tiền</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {order.items.map((item) => (
                                    <tr key={item.id}>
                                      <td className="py-1.5 text-gray-800">{item.menuItem.name}</td>
                                      <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                                      <td className="py-1.5 text-right text-gray-600">{formatPrice(item.priceAtOrder)}</td>
                                      <td className="py-1.5 text-right font-medium text-gray-900">
                                        {formatPrice(item.priceAtOrder * item.quantity)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-gray-200">
                                    <td colSpan={3} className="pt-2 text-right text-sm text-gray-500">
                                      Tổng đơn:
                                    </td>
                                    <td className="pt-2 text-right font-bold text-orange-600">
                                      {formatPrice(orderTotal(order))}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
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
