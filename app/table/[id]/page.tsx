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
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Login
  // ═══════════════════════════════════════════════════════════════════════════

  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo / header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🍽️</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Nhà Hàng</h1>
            <p className="text-orange-100 mt-1">Chào mừng bạn đến với chúng tôi</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-6">
            {/* Table number */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-orange-50 rounded-2xl px-5 py-3">
                <span className="text-2xl">🪑</span>
                <div className="text-left">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Bàn của bạn</p>
                  <p className="text-2xl font-bold text-orange-500">Bàn {tableId}</p>
                </div>
              </div>
            </div>

            {sessionEnded && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="text-sm font-medium text-amber-700">⚠️ Phiên làm việc đã kết thúc</p>
                <p className="text-xs text-amber-600 mt-0.5">Vui lòng đăng nhập lại để tiếp tục</p>
              </div>
            )}

            {authLoading && qrToken ? (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Đang xác thực QR...</p>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mật khẩu bàn
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                      placeholder="Nhập mật khẩu..."
                      className={cn(
                        "block w-full rounded-xl border-2 px-4 py-3 pr-10 text-sm placeholder-gray-400 focus:outline-none transition-colors",
                        authError
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-200 focus:border-orange-400"
                      )}
                      autoFocus
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {authError && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <span>⚠️</span> {authError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !password.trim()}
                  className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-semibold text-base hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {authLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>🔑</span> Vào bàn
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-gray-400 mt-4">
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
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <div>
              <p className="text-xs text-gray-500 leading-none">Nhà Hàng</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">Bàn {tableId}</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("menu")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[36px]",
                activeTab === "menu"
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              📋 Thực đơn
            </button>
            <button
              onClick={() => { setActiveTab("orders"); fetchOrders(); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[36px] relative",
                activeTab === "orders"
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              🧾 Đơn của tôi
              {orders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[36px]",
                activeTab === "feedback"
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              💬 Feedback
            </button>
          </div>
        </div>
      </header>

      {/* ── Menu Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "menu" && (
        <div className="flex-1 flex flex-col pb-32">
          {/* Category filter */}
          <div className="sticky top-[61px] z-30 bg-white border-b border-gray-100">
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 min-h-[36px]",
                    selectedCategory === cat
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm animate-pulse">
                    <div className="h-36 bg-gray-200 rounded-t-2xl" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl block mb-3">🍽️</span>
                <p className="text-gray-500">Không có món nào trong danh mục này</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
        <div className="flex-1 flex flex-col pb-32 p-4 space-y-3">
          {ordersLoading && orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Đang tải đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl block mb-3">🧾</span>
              <p className="text-gray-500 font-medium">Chưa có đơn nào</p>
              <p className="text-sm text-gray-400 mt-1">Hãy chọn món từ thực đơn nhé!</p>
              <button
                onClick={() => setActiveTab("menu")}
                className="mt-4 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold min-h-[44px]"
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
              <div className="bg-white rounded-2xl shadow-sm p-4 border border-orange-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Tổng cộng</span>
                  <span className="text-xl font-bold text-orange-500">{formatPrice(grandTotal)}</span>
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
              <div className="bg-white rounded-3xl shadow-sm p-8 text-center space-y-4 mt-4">
                <div className="text-6xl">🙏</div>
                <h2 className="text-xl font-bold text-gray-800">Cảm ơn bạn đã phản hồi!</h2>
                <p className="text-gray-500 text-sm">Ý kiến của bạn rất quan trọng với chúng tôi.</p>
                <button
                  onClick={() => {
                    setFeedbackSubmitted(false);
                    setFeedbackRating(0);
                    setFeedbackComment("");
                    setFeedbackError("");
                  }}
                  className="mt-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold transition-colors min-h-[44px]"
                >
                  Gửi thêm feedback
                </button>
              </div>
            ) : (
              /* ── Feedback form ── */
              <div className="bg-white rounded-3xl shadow-sm p-6 mt-4 space-y-6">
                {/* Title */}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-gray-800">Chia sẻ trải nghiệm của bạn 💬</h2>
                  <p className="text-sm text-gray-500">Phản hồi của bạn giúp chúng tôi cải thiện dịch vụ</p>
                </div>

                {/* Star rating */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 text-center">Đánh giá của bạn</p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="w-12 h-12 flex items-center justify-center text-3xl transition-transform hover:scale-110 active:scale-95"
                        aria-label={`${star} sao`}
                      >
                        <span className={star <= feedbackRating ? "text-orange-400" : "text-gray-300"}>
                          {star <= feedbackRating ? "★" : "☆"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Nhận xét</label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Nhận xét thêm (không bắt buộc)..."
                    rows={4}
                    className="w-full rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none px-4 py-3 text-sm placeholder-gray-400 resize-none transition-colors"
                  />
                </div>

                {/* Error */}
                {feedbackError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <span>⚠️</span> {feedbackError}
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
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors min-h-[52px]"
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
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-gray-100 via-gray-50/80 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <button
              onClick={() => setConfirmOrderOpen(true)}
              className="w-full flex items-center justify-between bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-2xl px-5 py-4 shadow-xl transition-colors min-h-[56px]"
            >
              <div className="flex items-center gap-2">
                <span className="bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {cartCount}
                </span>
                <span className="font-medium">món đã chọn</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatPrice(cartTotal)}</span>
                <span className="bg-white text-orange-500 rounded-lg px-3 py-1 text-sm font-bold">
                  Gọi món
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky payment button (orders tab) ─────────────────────────────── */}
      {activeTab === "orders" && orders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-100">
          <button
            onClick={requestPayment}
            disabled={paymentLoading}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl px-5 py-4 shadow-lg transition-colors min-h-[56px] font-semibold text-base"
          >
            {paymentLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>🔔 Gọi thanh toán</>
            )}
          </button>
        </div>
      )}

      {/* ── Payment toast ───────────────────────────────────────────────────── */}
      {paymentToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white rounded-2xl px-5 py-3 shadow-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <span>✅</span>
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
        <div className="space-y-3">
          <p className="text-gray-600 text-sm">
            Bạn muốn gọi <strong>{cartCount} món</strong> với tổng{" "}
            <strong className="text-orange-500">{formatPrice(cartTotal)}</strong>?
          </p>

          {/* Cart summary */}
          <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl bg-gray-50 p-3">
            {Object.entries(cart).map(([id, qty]) => {
              const item = menuItems.find((m) => m.id === id);
              if (!item) return null;
              return (
                <div key={id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 flex-1 truncate">{item.name}</span>
                  <span className="text-gray-500 ml-2">x{qty}</span>
                  <span className="text-gray-800 font-medium ml-3 w-24 text-right">
                    {formatPrice(item.price * qty)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
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
    <div className={cn("bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col transition-transform active:scale-[0.98]", quantity > 0 && "ring-2 ring-orange-400")}>
      {/* Image — click to preview */}
      <div
        className="relative h-36 bg-gray-100 flex-shrink-0 cursor-pointer"
        onClick={onPreview}
      >
        {firstImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstImage} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍴</div>
        )}
        {quantity > 0 && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
            {quantity}
          </div>
        )}
        {imageCount > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
            1/{imageCount}
          </div>
        )}
      </div>

      {/* Info — click to preview */}
      <div className="p-3 flex flex-col gap-1 flex-1 cursor-pointer" onClick={onPreview}>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-gray-400 line-clamp-2 flex-1">{item.description}</p>
        )}
      </div>

      {/* Price + qty — stop propagation */}
      <div className="px-3 pb-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-bold text-orange-500">{formatPrice(item.price)}</span>
        {quantity === 0 ? (
          <button
            onClick={onAdd}
            className="w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-sm transition-colors"
            aria-label={`Thêm ${item.name}`}
          >
            +
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={onRemove} className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full flex items-center justify-center text-base font-bold transition-colors">−</button>
            <span className="w-5 text-center text-sm font-semibold text-gray-800">{quantity}</span>
            <button onClick={onAdd} className="w-7 h-7 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center text-base font-bold transition-colors">+</button>
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-white font-semibold text-lg">{item.name}</h3>
          {item.description && <p className="text-gray-400 text-sm mt-0.5">{item.description}</p>}
          <p className="text-orange-400 font-bold mt-1">{formatPrice(item.price)}</p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none ml-4">✕</button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center relative px-4" onClick={(e) => e.stopPropagation()}>
        {images.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[current]}
              alt={`${item.name} ${current + 1}`}
              className="max-h-full max-w-full object-contain rounded-xl"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrent((c) => (c > 0 ? c - 1 : images.length - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xl"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrent((c) => (c < images.length - 1 ? c + 1 : 0))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xl"
                >
                  ›
                </button>
              </>
            )}
          </>
        ) : (
          <div className="text-6xl">🍴</div>
        )}
      </div>

      {/* Dots + thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          {images.map((url, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className={cn("w-12 h-12 object-cover rounded-lg border-2 transition-all", idx === current ? "border-orange-500 scale-110" : "border-transparent opacity-60")}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </button>
          ))}
        </div>
      )}
      <p className="text-center text-gray-500 text-xs pb-4">{images.length > 0 ? `${current + 1} / ${images.length}` : ""}</p>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, index }: { order: Order; index: number }) {
  const orderTotal = order.items.reduce((s, it) => s + it.priceAtOrder * it.quantity, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Order header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-700">Lần gọi #{index}</p>
          <p className="text-xs text-gray-400">{formatDate(order.calledAt)}</p>
        </div>
        <Badge status={order.status} />
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {order.items.map((it) => (
          <div key={it.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{it.menuItem.name}</p>
              <p className="text-xs text-gray-400">
                {formatPrice(it.priceAtOrder)} × {it.quantity}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge status={it.status} />
              <span className="text-sm font-semibold text-gray-800 w-20 text-right">
                {formatPrice(it.priceAtOrder * it.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Order total */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Tổng lần này</span>
        <span className="text-sm font-bold text-gray-800">{formatPrice(orderTotal)}</span>
      </div>
    </div>
  );
}

// ─── Page export (wraps inner component in Suspense for useSearchParams) ───────

export default function TablePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-orange-50">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TablePageInner />
    </Suspense>
  );
}
