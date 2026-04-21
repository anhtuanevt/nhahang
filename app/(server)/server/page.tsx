"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { formatPrice, formatDate } from "@/lib/utils";

// ---- Types ----

interface ActiveSession {
  id: string;
  startedAt: string;
  pendingOrdersCount: number;
}

interface Table {
  id: string;
  number: number;
  name: string;
  status: "ready" | "occupied" | "payment_requested";
  qrToken: string;
  activeSession: ActiveSession | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  priceAtOrder: number;
  status: string;
  menuItem: MenuItem;
}

interface Order {
  id: string;
  sessionId: string;
  tableId: string;
  status: string;
  calledAt: string;
  items: OrderItem[];
}

interface HistoryOrderItem {
  id: string; quantity: number; priceAtOrder: number;
  menuItem: { name: string };
}
interface HistoryOrder {
  id: string; status: string; calledAt: string;
  items: HistoryOrderItem[];
}
interface HistorySession {
  id: string; status: string; startedAt: string; endedAt: string | null;
  table: { number: number; name: string | null };
  orders: HistoryOrder[];
}

// ---- Helpers ----

function tableColorClass(status: Table["status"]): string {
  switch (status) {
    case "ready":             return "bg-gray-50 border-gray-200";
    case "occupied":          return "bg-blue-50 border-blue-200";
    case "payment_requested": return "bg-yellow-100 border-yellow-300";
    default:                  return "bg-gray-50 border-gray-200";
  }
}

// ---- Invoice Modal ----

function InvoiceModal({
  table,
  orders,
  onClose,
}: {
  table: Table;
  orders: Order[];
  onClose: () => void;
}) {
  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const grandTotal = activeOrders.reduce(
    (sum, o) =>
      sum +
      o.items
        .filter((i) => i.status !== "cancelled")
        .reduce((s, i) => s + i.priceAtOrder * i.quantity, 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center print:static print:inset-auto">
      <div className="absolute inset-0 bg-black/50 print:hidden" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:rounded-xl shadow-2xl sm:max-w-md sm:mx-4 rounded-t-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full print:m-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 print:hidden">
          <span className="font-semibold text-gray-800">Preview hóa đơn</span>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              🖨️ In hóa đơn
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>

        {/* Invoice content */}
        <div className="p-6 space-y-4 print:p-4 overflow-y-auto max-h-[75vh] sm:max-h-[80vh]" id="invoice-content">
          <div className="text-center border-b border-dashed border-gray-300 pb-4">
            <p className="text-xl font-bold">NHÀ HÀNG DEMO</p>
            <p className="text-sm text-gray-500 mt-1">HÓA ĐƠN THANH TOÁN</p>
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Bàn:</span>
              <span className="font-medium">{table.name || `Bàn ${table.number}`}</span>
            </div>
            {table.activeSession && (
              <div className="flex justify-between">
                <span className="text-gray-500">Thời gian vào:</span>
                <span className="font-medium">{formatDate(table.activeSession.startedAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">In lúc:</span>
              <span className="font-medium">{formatDate(new Date())}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase">
                  <th className="text-left pb-2 font-medium">Món</th>
                  <th className="text-center pb-2 font-medium w-10">SL</th>
                  <th className="text-right pb-2 font-medium">Giá</th>
                  <th className="text-right pb-2 font-medium">T.Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeOrders.map((order, idx) => (
                  <Fragment key={order.id}>
                    <tr>
                      <td colSpan={4} className="py-1.5 text-xs text-gray-400 italic">
                        Lần gọi #{idx + 1} — {formatDate(order.calledAt)}
                      </td>
                    </tr>
                    {order.items
                      .filter((i) => i.status !== "cancelled")
                      .map((item) => (
                        <tr key={item.id}>
                          <td className="py-1.5 text-gray-800">{item.menuItem.name}</td>
                          <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                          <td className="py-1.5 text-right text-gray-600">{formatPrice(item.priceAtOrder)}</td>
                          <td className="py-1.5 text-right font-medium">{formatPrice(item.priceAtOrder * item.quantity)}</td>
                        </tr>
                      ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t-2 border-gray-800 pt-3 flex justify-between items-center">
            <span className="font-bold text-lg">TỔNG CỘNG</span>
            <span className="font-bold text-xl text-orange-600">{formatPrice(grandTotal)}</span>
          </div>

          <p className="text-center text-xs text-gray-400 pt-2 border-t border-dashed border-gray-200">
            Cảm ơn quý khách! Hẹn gặp lại 🙏
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body > *:not(#__next) { display: none !important; }
          .fixed.inset-0 { position: static !important; }
          .absolute.inset-0 { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ---- Order Panel (shared between desktop sidebar + mobile sheet) ----

function OrderPanel({
  table,
  orders,
  ordersLoading,
  actionLoading,
  collapsedOrders,
  onClose,
  onShowInvoice,
  onProcessPayment,
  onMarkOrderDone,
  onMarkOrderCancelled,
  onMarkItemDone,
  onMarkItemCancelled,
  onToggleCollapse,
}: {
  table: Table;
  orders: Order[];
  ordersLoading: boolean;
  actionLoading: string | null;
  collapsedOrders: Set<string>;
  onClose: () => void;
  onShowInvoice: () => void;
  onProcessPayment: (sessionId: string) => void;
  onMarkOrderDone: (orderId: string) => void;
  onMarkOrderCancelled: (orderId: string) => void;
  onMarkItemDone: (orderId: string, itemId: string) => void;
  onMarkItemCancelled: (orderId: string, itemId: string) => void;
  onToggleCollapse: (orderId: string) => void;
}) {
  if (table.status === "ready") {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 p-6">
        <span className="text-4xl mb-2">✅</span>
        <p className="text-sm font-medium">Bàn {table.number} đang trống</p>
      </div>
    );
  }

  return (
    <>
      {/* Panel header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-gray-800">{table.name || `Bàn ${table.number}`}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge status={table.status} />
              {table.activeSession && (
                <span className="text-xs text-gray-400">{formatDate(table.activeSession.startedAt)}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5">✕</button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {(orders.length > 0 || table.status === "payment_requested") && (
            <Button variant="secondary" size="sm" onClick={onShowInvoice}>
              🧾 In hóa đơn
            </Button>
          )}
          {table.status === "payment_requested" && table.activeSession && (
            <Button
              variant="success"
              size="sm"
              loading={actionLoading === `payment-${table.activeSession.id}`}
              onClick={() => onProcessPayment(table.activeSession!.id)}
            >
              ✅ Đã thanh toán
            </Button>
          )}
        </div>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {ordersLoading ? (
          <div className="flex items-center justify-center h-32">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="text-3xl mb-2">📋</span>
            <p className="text-sm font-medium">Chưa có đơn hàng nào</p>
          </div>
        ) : (
          orders.map((order, idx) => {
            const isCollapsed = collapsedOrders.has(order.id);
            const orderTotal = order.items
              .filter((i) => i.status !== "cancelled")
              .reduce((s, i) => s + i.priceAtOrder * i.quantity, 0);
            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div
                  className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => onToggleCollapse(order.id)}
                >
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className={`text-gray-400 text-xs transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>▼</span>
                    <span className="text-xs font-semibold text-gray-700">#{idx + 1}</span>
                    <Badge status={order.status} />
                    <span className="text-xs text-gray-400 truncate">{formatDate(order.calledAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-gray-600">{formatPrice(orderTotal)}</span>
                    {order.status === "pending" && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="success" size="sm" loading={actionLoading === `order-done-${order.id}`} onClick={() => onMarkOrderDone(order.id)}>✓ Done</Button>
                        <Button variant="danger" size="sm" loading={actionLoading === `order-cancel-${order.id}`} onClick={() => onMarkOrderCancelled(order.id)}>Hủy</Button>
                      </div>
                    )}
                  </div>
                </div>

                {!isCollapsed && (
                  <ul className="divide-y divide-gray-50">
                    {order.items.map((item) => (
                      <li key={item.id} className="px-3 py-2.5 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-800 truncate">{item.menuItem.name}</span>
                            <span className="text-gray-400 text-xs">×{item.quantity}</span>
                            <Badge status={item.status} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.priceAtOrder * item.quantity)}</p>
                        </div>
                        {item.status === "pending" && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="success" size="sm" loading={actionLoading === `item-done-${item.id}`} onClick={() => onMarkItemDone(order.id, item.id)}>✓</Button>
                            <Button variant="danger" size="sm" loading={actionLoading === `item-cancel-${item.id}`} onClick={() => onMarkItemCancelled(order.id, item.id)}>✕</Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

// ---- Main Component ----

export default function ServerPage() {
  const router = useRouter();

  const [activeView, setActiveView] = useState<"tables" | "history">("tables");
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [collapsedOrders, setCollapsedOrders] = useState<Set<string>>(new Set());
  const [showInvoice, setShowInvoice] = useState(false);
  const [paidData, setPaidData] = useState<{ table: Table; orders: Order[] } | null>(null);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [reprintSession, setReprintSession] = useState<HistorySession | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const handleUnauthorized = useCallback(() => router.push("/server/login"), [router]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch("/api/server/tables", { credentials: "include" });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) setTables(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [handleUnauthorized]);

  const fetchOrders = useCallback(async (tableId: string) => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/server/orders?tableId=${tableId}`, { credentials: "include" });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) setOrders(await res.json());
    } catch { /* ignore */ } finally { setOrdersLoading(false); }
  }, [handleUnauthorized]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/server/history", { credentials: "include" });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) setHistory(await res.json());
    } catch { /* ignore */ } finally { setHistoryLoading(false); }
  }, [handleUnauthorized]);

  useEffect(() => {
    if (activeView === "history") fetchHistory();
  }, [activeView, fetchHistory]);

  useEffect(() => {
    fetchTables();
    const sse = new EventSource("/api/sse?channel=server");
    sseRef.current = sse;
    sse.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        const { type, tableId } = event;
        if (["new_order", "table_occupied", "payment_requested"].includes(type)) {
          fetchTables();
          setSelectedTableId((cur) => { if (cur && cur === tableId) fetchOrders(cur); return cur; });
        } else if (type === "order_updated") {
          setSelectedTableId((cur) => { if (cur && cur === tableId) fetchOrders(cur); return cur; });
        }
      } catch { /* ignore */ }
    };
    return () => { sse.close(); sseRef.current = null; };
  }, [fetchTables, fetchOrders]);

  useEffect(() => {
    if (selectedTableId) fetchOrders(selectedTableId);
    else setOrders([]);
    setCollapsedOrders(new Set());
    setShowInvoice(false);
  }, [selectedTableId, fetchOrders]);

  function toggleCollapse(orderId: string) {
    setCollapsedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  }

  async function markOrderDone(orderId: string) {
    setActionLoading(`order-done-${orderId}`);
    try {
      const res = await fetch(`/api/server/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "done" }) });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok && selectedTableId) { fetchOrders(selectedTableId); fetchTables(); }
    } finally { setActionLoading(null); }
  }

  async function markOrderCancelled(orderId: string) {
    setActionLoading(`order-cancel-${orderId}`);
    try {
      const res = await fetch(`/api/server/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "cancelled" }) });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok && selectedTableId) { fetchOrders(selectedTableId); fetchTables(); }
    } finally { setActionLoading(null); }
  }

  async function markItemDone(orderId: string, itemId: string) {
    setActionLoading(`item-done-${itemId}`);
    try {
      const res = await fetch(`/api/server/orders/${orderId}/items/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "done" }) });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok && selectedTableId) fetchOrders(selectedTableId);
    } finally { setActionLoading(null); }
  }

  async function markItemCancelled(orderId: string, itemId: string) {
    setActionLoading(`item-cancel-${itemId}`);
    try {
      const res = await fetch(`/api/server/orders/${orderId}/items/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "cancelled" }) });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok && selectedTableId) fetchOrders(selectedTableId);
    } finally { setActionLoading(null); }
  }

  async function processPayment(sessionId: string) {
    const tableSnapshot = selectedTable;
    const ordersSnapshot = [...orders];
    setActionLoading(`payment-${sessionId}`);
    try {
      const res = await fetch(`/api/server/sessions/${sessionId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "paid" }) });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (res.ok) {
        await fetchTables();
        setSelectedTableId(null);
        // save snapshot so invoice can still be printed after session is cleared
        setPaidData({ table: tableSnapshot!, orders: ordersSnapshot });
        setShowInvoice(true);
      }
    } finally { setActionLoading(null); }
  }

  async function handleLogout() {
    await fetch("/api/server/logout", { method: "POST", credentials: "include" });
    router.push("/server/login");
  }

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  const panelProps = selectedTable ? {
    table: selectedTable,
    orders,
    ordersLoading,
    actionLoading,
    collapsedOrders,
    onClose: () => setSelectedTableId(null),
    onShowInvoice: () => { setPaidData(null); setShowInvoice(true); },
    onProcessPayment: processPayment,
    onMarkOrderDone: markOrderDone,
    onMarkOrderCancelled: markOrderCancelled,
    onMarkItemDone: markItemDone,
    onMarkItemCancelled: markItemCancelled,
    onToggleCollapse: toggleCollapse,
  } : null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xl print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-sm">🍜</span>
            </div>
            <span className="font-bold text-base hidden sm:inline tracking-tight">Màn hình phục vụ</span>
          </div>
          {/* Tab switcher */}
          <div className="flex bg-gray-800 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setActiveView("tables")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 min-h-[32px] ${activeView === "tables" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-white"}`}
            >
              Bàn
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 min-h-[32px] ${activeView === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-white"}`}
            >
              Lịch sử
            </button>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-gray-700">
          Đăng xuất
        </Button>
      </header>

      {/* History view */}
      {activeView === "history" && (
        <div className="flex-1 overflow-y-auto bg-white print:hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 sticky top-0">
            <span className="text-sm font-semibold text-gray-700">Lịch sử hôm nay</span>
            <button onClick={fetchHistory} className="text-gray-400 hover:text-orange-500 transition-colors p-1 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          {historyLoading ? (
            <div className="flex justify-center py-16">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="text-4xl block mb-2">📋</span>
              <p className="text-sm">Chưa có phiên nào hôm nay</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {history.map((session) => {
                const total = session.orders.flatMap((o) => o.items).reduce((s, i) => s + i.priceAtOrder * i.quantity, 0);
                const itemCount = session.orders.flatMap((o) => o.items).reduce((s, i) => s + i.quantity, 0);
                const expanded = expandedHistory.has(session.id);
                return (
                  <div key={session.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white hover:shadow-sm transition-shadow duration-200">
                    <button
                      className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedHistory((prev) => { const n = new Set(prev); n.has(session.id) ? n.delete(session.id) : n.add(session.id); return n; })}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
                        <span className="font-semibold text-gray-800">Bàn {session.table.number}</span>
                        <span className="text-xs text-gray-400">{formatDate(session.startedAt)}</span>
                        <span className="text-xs text-gray-500">{itemCount} món</span>
                        <span className="text-sm font-semibold text-orange-600">{formatPrice(total)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setReprintSession(session); }}
                          className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                          title="In lại hóa đơn"
                        >
                          🖨️
                        </button>
                        <span className="text-gray-400 text-xs">{expanded ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {expanded && (
                      <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                        {session.orders.map((order, idx) => (
                          <div key={order.id}>
                            <p className="text-xs text-gray-400 mb-1.5">Đơn #{idx + 1} — {formatDate(order.calledAt)}</p>
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{item.menuItem.name} <span className="text-gray-400">×{item.quantity}</span></span>
                                  <span className="text-gray-600">{formatPrice(item.priceAtOrder * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                          <span className="text-gray-700">Tổng phiên</span>
                          <span className="text-orange-600">{formatPrice(total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={`flex flex-1 overflow-hidden print:hidden ${activeView !== "tables" ? "hidden" : ""}`}>
        {/* Table grid */}
        <div className="flex-1 flex flex-col overflow-hidden md:border-r md:border-gray-200 bg-white">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
            <span className="text-sm font-semibold text-gray-700">Danh sách bàn</span>
            <button onClick={fetchTables} title="Làm mới" className="text-gray-400 hover:text-orange-500 transition-colors p-1 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
              </div>
            ) : tables.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-8">Không có bàn nào</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id === selectedTableId ? null : table.id)}
                    className={[
                      "relative text-left rounded-xl border-2 p-3 sm:p-4 transition-all",
                      tableColorClass(table.status),
                      table.id === selectedTableId
                        ? "border-orange-400 ring-2 ring-orange-200 shadow-md"
                        : "hover:border-orange-300 hover:shadow-sm",
                    ].join(" ")}
                  >
                    {table.status === "payment_requested" && (
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 rounded-full bg-green-500 text-white text-xs font-bold px-1.5 shadow whitespace-nowrap">
                        💳
                      </span>
                    )}
                    {table.status !== "payment_requested" && table.activeSession && table.activeSession.pendingOrdersCount > 0 && (
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-orange-500 text-white text-xs font-bold px-1 shadow">
                        {table.activeSession.pendingOrdersCount}
                      </span>
                    )}
                    <p className="text-xl sm:text-2xl font-bold text-gray-800 leading-none mb-1.5">
                      {table.number}
                    </p>
                    {table.name && table.name !== `Bàn ${table.number}` && (
                      <p className="text-xs text-gray-500 truncate mb-1">{table.name}</p>
                    )}
                    <Badge status={table.status} />
                    {table.activeSession && (
                      <p className="text-xs text-gray-400 mt-1 truncate hidden sm:block">
                        {formatDate(table.activeSession.startedAt)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop right panel */}
        <aside className="hidden md:flex w-[400px] shrink-0 flex-col overflow-hidden bg-gray-50">
          {!panelProps ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
              <span className="text-5xl mb-3">🍽️</span>
              <p className="text-base font-medium text-center">Chọn một bàn để xem đơn hàng</p>
            </div>
          ) : (
            <OrderPanel {...panelProps} />
          )}
        </aside>
      </div>

      {/* Mobile bottom sheet */}
      {selectedTable && panelProps && (
        <div className="md:hidden fixed inset-0 z-40 print:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedTableId(null)} />
          <div className="absolute bottom-0 left-0 right-0 bg-gray-50 rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <OrderPanel {...panelProps} />
          </div>
        </div>
      )}

      {/* Reprint invoice from history */}
      {reprintSession && (
        <InvoiceModal
          table={{
            id: "", number: reprintSession.table.number,
            name: reprintSession.table.name ?? "",
            status: "ready", qrToken: "",
            activeSession: { id: "", startedAt: reprintSession.startedAt, pendingOrdersCount: 0 },
          }}
          orders={reprintSession.orders as unknown as Order[]}
          onClose={() => setReprintSession(null)}
        />
      )}

      {/* Invoice modal */}
      {showInvoice && (paidData || selectedTable) && (
        <InvoiceModal
          table={paidData?.table ?? selectedTable!}
          orders={paidData?.orders ?? orders}
          onClose={() => { setShowInvoice(false); setPaidData(null); }}
        />
      )}
    </div>
  );
}
