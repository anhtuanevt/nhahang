"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import { Modal } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import { cn, formatPrice, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  imageUrl?: string;
}

interface OrderItem {
  id: string;
  status: string;
  quantity: number;
  priceAtOrder: number;
  menuItem: { name: string; price: number };
}

interface Order {
  id: string;
  sessionId: string;
  tableId: string;
  status: string;
  calledAt: string;
  items: OrderItem[];
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function TablePageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const tableId = params.id;
  const qrToken = searchParams.get("qr");

  // Auth state
  const [authState, setAuthState] = useState<"loading" | "unauthenticated" | "authenticated">("loading");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // App state
  const [activeTab, setActiveTab] = useState<"menu" | "orders" | "feedback">("menu");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [paymentRequested, setPaymentRequested] = useState(false);

  // UI state
  const [confirmOrderOpen, setConfirmOrderOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentToast, setPaymentToast] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const handle401 = useCallback(() => {
    setSessionEnded(true);
    setAuthState("unauthenticated");
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // ── Fetch menu ───────────────────────────────────────────────────────────────

  const fetchMenu = useCallback(async () => {
    setMenuLoading(true);
    try {
      const res = await fetch(`/api/table/${tableId}/menu`);
      if (!res.ok) return;
      const json = await res.json();
      const data: MenuItem[] = Array.isArray(json)
        ? json
        : Object.values(json as Record<string, MenuItem[]>).flat();
      setMenuItems(data);
    } catch {
      // network error — silently fail, keep existing menu
    } finally {
      setMenuLoading(false);
    }
  }, [tableId]);

  // ── Fetch orders ─────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/table/${tableId}/order`, { credentials: "include" });
      if (res.status === 401) { handle401(); return; }
      if (!res.ok) return;
      const json = await res.json();
      const data: Order[] = Array.isArray(json) ? json : (json.orders ?? []);
      setOrders(data);
    } catch {
      // network error — silently fail
    } finally {
      setOrdersLoading(false);
    }
  }, [tableId, handle401]);

  // ── Auth ─────────────────────────────────────────────────────────────────────

  const authenticate = useCallback(async (payload: { qrToken?: string; password?: string }) => {
    const res = await fetch(`/api/table/${tableId}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return res;
  }, [tableId]);

  // QR auto-login on mount
  useEffect(() => {
    if (qrToken) {
      setAuthLoading(true);
      authenticate({ qrToken })
        .then((res) => {
          if (res.ok) {
            setAuthState("authenticated");
          } else {
            setAuthState("unauthenticated");
          }
        })
        .catch(() => setAuthState("unauthenticated"))
        .finally(() => setAuthLoading(false));
    } else {
      setAuthState("unauthenticated");
    }
  }, [qrToken, authenticate]);

  // Password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await authenticate({ password });
      if (res.ok) {
        setSessionEnded(false);
        setAuthState("authenticated");
      } else {
        const body = await res.json().catch(() => ({}));
        setAuthError(body?.error || "Mật khẩu không đúng. Vui lòng thử lại.");
      }
    } catch {
      setAuthError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Effects after auth ────────────────────────────────────────────────────────

  useEffect(() => {
    if (authState !== "authenticated") return;
    fetchMenu();
    fetchOrders();

    // Poll orders every 10 seconds
    pollRef.current = setInterval(fetchOrders, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [authState, fetchMenu, fetchOrders]);

  // ── Cart helpers ──────────────────────────────────────────────────────────────

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    return sum + (item?.price ?? 0) * qty;
  }, 0);

  const setItemQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const newQty = (next[id] ?? 0) + delta;
      if (newQty <= 0) delete next[id];
      else next[id] = newQty;
      return next;
    });
  };

  // ── Place order ───────────────────────────────────────────────────────────────

  const placeOrder = async () => {
    setOrderLoading(true);
    try {
      const items = Object.entries(cart).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
      const res = await fetch(`/api/table/${tableId}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      });
      if (res.status === 401) { handle401(); return; }
      if (res.ok) {
        setCart({});
        setConfirmOrderOpen(false);
        await fetchOrders();
        setActiveTab("orders");
      }
    } catch {
      // silently fail
    } finally {
      setOrderLoading(false);
    }
  };

  // ── Request payment ───────────────────────────────────────────────────────────

  const requestPayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/table/${tableId}/payment`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) { handle401(); return; }
      if (res.ok) {
        setPaymentRequested(true);
        setPaymentToast(true);
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setPaymentToast(false), 3000);
      }
    } catch {
      // silently fail
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Category grouping ─────────────────────────────────────────────────────────

  const categories = ["all", ...Array.from(new Set(menuItems.map((m) => m.category)))];
  const filteredItems =
    selectedCategory === "all" ? menuItems : menuItems.filter((m) => m.category === selectedCategory);

  // ── Orders totals ─────────────────────────────────────────────────────────────

  const grandTotal = orders.reduce(
    (sum, order) => sum + order.items.reduce((s, it) => s + it.priceAtOrder * it.quantity, 0),
    0
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Loading
  // ═══════════════════════════════════════════════════════════════════════════

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Login
  // ═══════════════════════════════════════════════════════════════════════════

  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-sm relative z-10">
          {/* Logo / header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-5 ring-4 ring-white/30">
              <span className="text-5xl">🍽️</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Nhà Hàng</h1>
            <p className="text-orange-100 mt-2 text-base">Chào mừng bạn đến với chúng tôi</p>
          </div>

          {/* Glass card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-7 ring-1 ring-white/50">
            {/* Table number */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl px-6 py-4">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🪑</div>
                <div className="text-left">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Bàn của bạn</p>
                  <p className="text-2xl font-bold text-orange-500 leading-tight">Bàn {tableId}</p>
                </div>
              </div>
            </div>

            {sessionEnded && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <p className="text-sm font-semibold text-amber-700">Phiên làm việc đã kết thúc</p>
                <p className="text-xs text-amber-600 mt-0.5">Vui lòng đăng nhập lại để tiếp tục</p>
              </div>
            )}

            {authLoading && qrToken ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">Đang xác thực QR...</p>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mật khẩu bàn
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                      placeholder="Nhập mật khẩu..."
                      className={cn(
                        "block w-full rounded-2xl border-2 px-4 py-3.5 pr-12 text-sm placeholder-gray-300 focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white",
                        authError
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                          : "border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                      )}
                      autoFocus
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors w-6 h-6 flex items-center justify-center"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {authError && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {authError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !password.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 min-h-[52px] shadow-lg shadow-orange-200"
                >
                  {authLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Vào bàn
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-gray-400 mt-5">
              Quét mã QR trên bàn để đăng nhập tự động
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Authenticated app
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100/80 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-lg">🍽️</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Nhà Hàng</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">
                Bàn{" "}
                <span className="text-orange-500">{tableId}</span>
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-0.5">
            <button
              onClick={() => setActiveTab("menu")}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[36px]",
                activeTab === "menu"
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Thực đơn
            </button>
            <button
              onClick={() => { setActiveTab("orders"); fetchOrders(); }}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[36px] relative",
                activeTab === "orders"
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Đơn món
              {orders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold shadow">
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 min-h-[36px]",
                activeTab === "feedback"
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Feedback
            </button>
          </div>
        </div>
      </header>

      {/* ── Menu Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "menu" && (
        <div className="flex-1 flex flex-col pb-32 max-w-2xl mx-auto w-full">
          {/* Category filter */}
          <div className="sticky top-[61px] z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100/80">
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex-shrink-0 min-h-[36px] border",
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 shadow-sm shadow-orange-200"
                      : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
                  )}
                >
                  {cat === "all" ? "Tất cả" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu grid */}
          <div className="p-4">
            {menuLoading && menuItems.length === 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm animate-pulse overflow-hidden">
                    <div className="h-44 bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-gray-200 rounded-lg w-full" />
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🍽️</span>
                </div>
                <p className="text-gray-500 font-medium">Không có món nào trong danh mục này</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    quantity={cart[item.id] ?? 0}
                    onAdd={() => setItemQty(item.id, 1)}
                    onRemove={() => setItemQty(item.id, -1)}
                    onPreview={() => setPreviewItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Orders Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <div className="flex-1 flex flex-col pb-32 p-4 space-y-3 max-w-2xl mx-auto w-full">
          {ordersLoading && orders.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium">Đang tải đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🧾</span>
              </div>
              <p className="text-gray-700 font-semibold text-lg">Chưa có đơn nào</p>
              <p className="text-sm text-gray-400 mt-1">Hãy chọn món từ thực đơn nhé!</p>
              <button
                onClick={() => setActiveTab("menu")}
                className="mt-5 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold min-h-[44px] shadow-lg shadow-orange-200 active:scale-[0.98] transition-all duration-200"
              >
                Xem thực đơn
              </button>
            </div>
          ) : (
            <>
              {orders.map((order, idx) => (
                <OrderCard key={order.id} order={order} index={orders.length - idx} />
              ))}

              {/* Grand total */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Tổng thanh toán</p>
                    <p className="text-xs text-gray-400 mt-0.5">{orders.length} lần gọi</p>
                  </div>
                  <span className="text-2xl font-bold text-orange-500">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Feedback Tab ───────────────────────────────────────────────────── */}
      {activeTab === "feedback" && (
        <div className="flex-1 flex flex-col pb-10 p-4">
          <div className="max-w-md mx-auto w-full">
            {feedbackSubmitted ? (
              /* ── Success screen ── */
              <div className="bg-white rounded-3xl shadow-sm p-10 text-center space-y-4 mt-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl">🙏</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Cảm ơn bạn đã phản hồi!</h2>
                <p className="text-gray-500 text-sm">Ý kiến của bạn rất quan trọng với chúng tôi.</p>
                <button
                  onClick={() => {
                    setFeedbackSubmitted(false);
                    setFeedbackRating(0);
                    setFeedbackComment("");
                    setFeedbackError("");
                  }}
                  className="mt-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] text-white text-sm font-bold transition-all duration-200 min-h-[44px] shadow-lg shadow-orange-200"
                >
                  Gửi thêm feedback
                </button>
              </div>
            ) : (
              /* ── Feedback form ── */
              <div className="bg-white rounded-3xl shadow-sm p-6 mt-4 space-y-6">
                {/* Title */}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-gray-800">Chia sẻ trải nghiệm của bạn</h2>
                  <p className="text-sm text-gray-400">Phản hồi của bạn giúp chúng tôi cải thiện dịch vụ</p>
                </div>

                {/* Star rating */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 text-center">Đánh giá của bạn</p>
                  <div className="flex items-center justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="w-14 h-14 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 rounded-2xl"
                        style={{
                          background: star <= feedbackRating ? "linear-gradient(135deg, #FED7AA, #FDBA74)" : "#F9FAFB",
                        }}
                        aria-label={`${star} sao`}
                      >
                        <span className={cn(
                          "text-3xl transition-all duration-200",
                          star <= feedbackRating ? "text-orange-500" : "text-gray-300"
                        )}>
                          {star <= feedbackRating ? "★" : "☆"}
                        </span>
                      </button>
                    ))}
                  </div>
                  {feedbackRating > 0 && (
                    <p className="text-center text-sm font-semibold text-orange-500">
                      {feedbackRating === 1 ? "Rất tệ" : feedbackRating === 2 ? "Tệ" : feedbackRating === 3 ? "Bình thường" : feedbackRating === 4 ? "Tốt" : "Rất tốt!"}
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Nhận xét thêm</label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn... (không bắt buộc)"
                    rows={4}
                    className="w-full rounded-2xl border-2 border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-50 focus:outline-none px-4 py-3 text-sm placeholder-gray-300 resize-none transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>

                {/* Error */}
                {feedbackError && (
                  <p className="text-sm text-red-600 flex items-center gap-1.5 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {feedbackError}
                  </p>
                )}

                {/* Submit */}
                <button
                  disabled={feedbackRating === 0 || feedbackSubmitting}
                  onClick={async () => {
                    if (feedbackRating === 0) return;
                    setFeedbackSubmitting(true);
                    setFeedbackError("");
                    try {
                      const res = await fetch(`/api/table/${tableId}/feedback`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment }),
                      });
                      if (res.ok) {
                        setFeedbackSubmitted(true);
                        setTimeout(() => {
                          setFeedbackSubmitted(false);
                          setFeedbackRating(0);
                          setFeedbackComment("");
                          setFeedbackError("");
                        }, 3000);
                      } else {
                        const body = await res.json().catch(() => ({}));
                        setFeedbackError(body?.error || "Gửi feedback thất bại. Vui lòng thử lại.");
                      }
                    } catch {
                      setFeedbackError("Lỗi kết nối. Vui lòng thử lại.");
                    } finally {
                      setFeedbackSubmitting(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-all duration-200 min-h-[52px] shadow-lg shadow-orange-200 active:scale-[0.98]"
                >
                  {feedbackSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Gửi feedback"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sticky cart bar (menu tab) ──────────────────────────────────────── */}
      {activeTab === "menu" && cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent pointer-events-none">
          <div className="pointer-events-auto max-w-2xl mx-auto">
            <button
              onClick={() => setConfirmOrderOpen(true)}
              className="w-full flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] text-white rounded-2xl px-5 py-4 shadow-2xl shadow-orange-300 transition-all duration-200 min-h-[60px]"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/25 rounded-xl w-9 h-9 flex items-center justify-center text-sm font-bold">
                  {cartCount}
                </div>
                <span className="font-semibold text-sm">món đã chọn</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">{formatPrice(cartTotal)}</span>
                <div className="bg-white text-orange-500 rounded-xl px-4 py-1.5 text-sm font-bold shadow-sm">
                  Đặt món
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky payment button (orders tab) ─────────────────────────────── */}
      {activeTab === "orders" && orders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/90 backdrop-blur-xl border-t border-gray-100">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={requestPayment}
              disabled={paymentLoading || paymentRequested}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl px-5 py-4 shadow-lg shadow-green-200 transition-all duration-200 min-h-[56px] font-bold text-base active:scale-[0.99]"
            >
              {paymentLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : paymentRequested ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Đã gọi thanh toán
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Gọi thanh toán
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Payment toast ───────────────────────────────────────────────────── */}
      {paymentToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white rounded-2xl px-5 py-3.5 shadow-2xl shadow-green-300 flex items-center gap-2.5 text-sm font-semibold">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Đã gọi thanh toán! Nhân viên sẽ đến ngay.</span>
        </div>
      )}

      {/* ── Image preview modal ──────────────────────────────────────────────── */}
      {previewItem && (
        <ImagePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {/* ── Confirm order modal ─────────────────────────────────────────────── */}
      <Modal
        open={confirmOrderOpen}
        onClose={() => !orderLoading && setConfirmOrderOpen(false)}
        title="Xác nhận gọi món"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Bạn muốn gọi <strong className="text-gray-800">{cartCount} món</strong> với tổng{" "}
            <strong className="text-orange-500">{formatPrice(cartTotal)}</strong>?
          </p>

          {/* Cart summary */}
          <div className="max-h-48 overflow-y-auto space-y-2 rounded-2xl bg-gray-50 p-4">
            {Object.entries(cart).map(([id, qty]) => {
              const item = menuItems.find((m) => m.id === id);
              if (!item) return null;
              return (
                <div key={id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 flex-1 truncate font-medium">{item.name}</span>
                  <span className="text-gray-400 ml-2 text-xs">×{qty}</span>
                  <span className="text-orange-500 font-semibold ml-3 w-24 text-right">
                    {formatPrice(item.price * qty)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmOrderOpen(false)}
              disabled={orderLoading}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={orderLoading}
              onClick={placeOrder}
            >
              Xác nhận gọi món
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Menu Card ────────────────────────────────────────────────────────────────

function MenuCard({
  item,
  quantity,
  onAdd,
  onRemove,
  onPreview,
}: {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const firstImage = item.imageUrl ? item.imageUrl.split("|")[0] : null;
  const imageCount = item.imageUrl ? item.imageUrl.split("|").filter(Boolean).length : 0;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 active:scale-[0.98]",
        "shadow-sm hover:shadow-md",
        quantity > 0 ? "ring-2 ring-orange-400 ring-offset-1" : "ring-1 ring-gray-100"
      )}
    >
      {/* Image — click to preview */}
      <div
        className="relative bg-gray-100 flex-shrink-0 cursor-pointer overflow-hidden"
        style={{ paddingBottom: "72%" }}
        onClick={onPreview}
      >
        <div className="absolute inset-0">
          {firstImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstImage}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-4xl opacity-60">🍴</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200" />
        </div>

        {quantity > 0 && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
            {quantity}
          </div>
        )}
        {imageCount > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium">
            1/{imageCount}
          </div>
        )}
        {!item.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1 rounded-full">Hết món</span>
          </div>
        )}
      </div>

      {/* Info — click to preview */}
      <div className="p-3 flex flex-col gap-1 flex-1 cursor-pointer" onClick={onPreview}>
        <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-gray-400 line-clamp-2 flex-1 leading-relaxed">{item.description}</p>
        )}
      </div>

      {/* Price + qty — stop propagation */}
      <div
        className="px-3 pb-3 flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-bold text-orange-500">{formatPrice(item.price)}</span>
        {quantity === 0 ? (
          <button
            onClick={onAdd}
            disabled={!item.available}
            className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-sm shadow-orange-200 transition-all duration-200 active:scale-95"
            aria-label={`Thêm ${item.name}`}
          >
            +
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRemove}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-base font-bold transition-colors active:scale-95"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-bold text-gray-800">{quantity}</span>
            <button
              onClick={onAdd}
              className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full flex items-center justify-center text-base font-bold transition-all duration-200 shadow-sm shadow-orange-200 active:scale-95"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Image Preview Modal ──────────────────────────────────────────────────────

function ImagePreviewModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const images = item.imageUrl ? item.imageUrl.split("|").filter(Boolean) : [];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrent((c) => (c > 0 ? c - 1 : images.length - 1));
      if (e.key === "ArrowRight") setCurrent((c) => (c < images.length - 1 ? c + 1 : 0));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, images.length]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={onClose}>
      {/* Header */}
      <div className="flex items-start justify-between p-5 shrink-0 safe-top" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-white font-bold text-lg leading-tight">{item.name}</h3>
          {item.description && (
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">{item.description}</p>
          )}
          <p className="text-orange-400 font-bold text-lg mt-1.5">{formatPrice(item.price)}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center relative px-4" onClick={(e) => e.stopPropagation()}>
        {images.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[current]}
              alt={`${item.name} ${current + 1}`}
              className="max-h-full max-w-full object-contain rounded-2xl"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrent((c) => (c > 0 ? c - 1 : images.length - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrent((c) => (c < images.length - 1 ? c + 1 : 0))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                >
                  ›
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center text-5xl">🍴</div>
        )}
      </div>

      {/* Dots + thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {images.map((url, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className={cn(
                  "w-14 h-14 object-cover rounded-xl border-2 transition-all duration-200",
                  idx === current ? "border-orange-500 scale-110 shadow-lg" : "border-transparent opacity-50"
                )}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </button>
          ))}
        </div>
      )}
      <p className="text-center text-gray-500 text-xs pb-5">{images.length > 0 ? `${current + 1} / ${images.length}` : ""}</p>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, index }: { order: Order; index: number }) {
  const orderTotal = order.items.reduce((s, it) => s + it.priceAtOrder * it.quantity, 0);

  const statusDot: Record<string, string> = {
    pending: "bg-orange-400",
    done: "bg-emerald-400",
    cancelled: "bg-red-400",
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100">
      {/* Order header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", statusDot[order.status] ?? "bg-gray-300")} />
          <div>
            <p className="text-sm font-bold text-gray-800">Lần gọi #{index}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.calledAt)}</p>
          </div>
        </div>
        <Badge status={order.status} />
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {order.items.map((it) => (
          <div key={it.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{it.menuItem.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatPrice(it.priceAtOrder)} × {it.quantity}
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <Badge status={it.status} />
              <span className="text-sm font-bold text-gray-800 w-20 text-right">
                {formatPrice(it.priceAtOrder * it.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Order total */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Tổng lần này</span>
        <span className="text-sm font-bold text-orange-500">{formatPrice(orderTotal)}</span>
      </div>
    </div>
  );
}

// ─── Page export (wraps inner component in Suspense for useSearchParams) ───────

export default function TablePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
          <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TablePageInner />
    </Suspense>
  );
}
