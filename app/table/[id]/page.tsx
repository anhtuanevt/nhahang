"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import { Modal } from "@/app/components/ui/Modal";
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

// ─── Inner component ──────────────────────────────────────────────────────────

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
  const [sessionEnded, setSessionEnded] = useState(false);

  // Data state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [menuLoading, setMenuLoading] = useState(false);

  // UI state
  const [confirmOrderOpen, setConfirmOrderOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);

  // Feedback popup (shown after payment)
  const [feedbackPopupOpen, setFeedbackPopupOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const handle401 = useCallback(() => {
    setSessionEnded(true);
    setAuthState("unauthenticated");
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

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
    } catch { /* silent */ } finally {
      setMenuLoading(false);
    }
  }, [tableId]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/table/${tableId}/order`, { credentials: "include" });
      if (res.status === 401) { handle401(); return; }
      if (!res.ok) return;
      const json = await res.json();
      setOrders(Array.isArray(json) ? json : (json.orders ?? []));
    } catch { /* silent */ }
  }, [tableId, handle401]);

  const authenticate = useCallback(async (payload: { qrToken?: string; password?: string }) => {
    return fetch(`/api/table/${tableId}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  }, [tableId]);

  // QR auto-login
  useEffect(() => {
    if (qrToken) {
      setAuthLoading(true);
      authenticate({ qrToken })
        .then((res) => setAuthState(res.ok ? "authenticated" : "unauthenticated"))
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

  useEffect(() => {
    if (authState !== "authenticated") return;
    fetchMenu();
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [authState, fetchMenu, fetchOrders]);

  // ── Cart helpers ──────────────────────────────────────────────────────────────

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    return sum + (menuItems.find((m) => m.id === id)?.price ?? 0) * qty;
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
      }
    } catch { /* silent */ } finally {
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
        setFeedbackPopupOpen(true);
      }
    } catch { /* silent */ } finally {
      setPaymentLoading(false);
    }
  };

  // ── Submit feedback ───────────────────────────────────────────────────────────

  const submitFeedback = async () => {
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
        setTimeout(() => setFeedbackPopupOpen(false), 2000);
      } else {
        const body = await res.json().catch(() => ({}));
        setFeedbackError(body?.error || "Gửi thất bại. Thử lại nhé.");
      }
    } catch {
      setFeedbackError("Lỗi kết nối.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const categories = ["all", ...Array.from(new Set(menuItems.map((m) => m.category)))];
  const filteredItems = selectedCategory === "all" ? menuItems : menuItems.filter((m) => m.category === selectedCategory);
  const grandTotal = orders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.priceAtOrder * it.quantity, 0), 0);
  const cartItems = Object.entries(cart).map(([id, qty]) => ({ item: menuItems.find((m) => m.id === id)!, qty })).filter((x) => x.item);

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
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-5 ring-4 ring-white/30">
              <span className="text-5xl">🍽️</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Nhà Hàng</h1>
            <p className="text-orange-100 mt-2 text-base">Chào mừng bạn đến với chúng tôi</p>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-7 ring-1 ring-white/50">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mật khẩu bàn</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                      placeholder="Nhập mật khẩu..."
                      className={cn(
                        "block w-full rounded-2xl border-2 px-4 py-3.5 pr-12 text-sm placeholder-gray-300 focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white",
                        authError ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50" : "border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                      )}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                  {authError && <p className="mt-2 text-xs text-red-600 font-medium">{authError}</p>}
                </div>
                <button type="submit" disabled={authLoading || !password.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 min-h-[52px] shadow-lg shadow-orange-200">
                  {authLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Vào bàn"}
                </button>
              </form>
            )}
            <p className="text-center text-xs text-gray-400 mt-5">Quét mã QR trên bàn để đăng nhập tự động</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Authenticated — 2-column layout
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-lg">🍽️</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Nhà Hàng</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">
                Bàn <span className="text-orange-500">{tableId}</span>
              </p>
            </div>
          </div>

          {/* Mobile: order badge button */}
          <button
            onClick={() => setMobileOrderOpen(true)}
            className="md:hidden relative flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Đơn của tôi
            {(cartCount + orders.length) > 0 && (
              <span className="w-5 h-5 bg-orange-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                {cartCount > 0 ? cartCount : orders.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main 2-column layout ─────────────────────────────────────────────── */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">

        {/* ── Left: Menu ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Category filter */}
          <div className="sticky top-[61px] z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all flex-shrink-0 border",
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 shadow-sm shadow-orange-200"
                      : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
                  )}>
                  {cat === "all" ? "Tất cả" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu grid */}
          <div className="p-4 pb-32 md:pb-8">
            {menuLoading && menuItems.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm animate-pulse overflow-hidden">
                    <div className="h-44 bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-gray-200 rounded-lg" />
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <span className="text-4xl">🍽️</span>
                <p className="text-gray-500 font-medium mt-3">Không có món nào trong danh mục này</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item) => (
                  <MenuCard key={item.id} item={item} quantity={cart[item.id] ?? 0}
                    onAdd={() => setItemQty(item.id, 1)}
                    onRemove={() => setItemQty(item.id, -1)}
                    onPreview={() => setPreviewItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Order panel (desktop only) ──────────────────────────────── */}
        <div className="hidden md:flex w-[360px] shrink-0 border-l border-gray-100 flex-col sticky top-[61px] h-[calc(100vh-61px)]">
          <OrderPanel
            cartItems={cartItems}
            orders={orders}
            cartTotal={cartTotal}
            grandTotal={grandTotal}
            paymentLoading={paymentLoading}
            paymentRequested={paymentRequested}
            onPlaceOrder={() => setConfirmOrderOpen(true)}
            onRemoveFromCart={(id) => setItemQty(id, -cart[id])}
            onAdjustCart={setItemQty}
            onRequestPayment={requestPayment}
          />
        </div>
      </div>

      {/* ── Mobile: cart sticky bar ──────────────────────────────────────────── */}
      {cartCount > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent">
          <button
            onClick={() => setMobileOrderOpen(true)}
            className="w-full flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl px-5 py-4 shadow-2xl shadow-orange-300 transition-all min-h-[60px]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/25 rounded-xl w-9 h-9 flex items-center justify-center text-sm font-bold">{cartCount}</div>
              <span className="font-semibold text-sm">món đã chọn</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm">{formatPrice(cartTotal)}</span>
              <div className="bg-white text-orange-500 rounded-xl px-3 py-1.5 text-sm font-bold">Xem đơn</div>
            </div>
          </button>
        </div>
      )}

      {/* ── Mobile: order drawer ─────────────────────────────────────────────── */}
      {mobileOrderOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOrderOpen(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 text-base">Đơn của tôi</h2>
              <button onClick={() => setMobileOrderOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <OrderPanel
                cartItems={cartItems}
                orders={orders}
                cartTotal={cartTotal}
                grandTotal={grandTotal}
                paymentLoading={paymentLoading}
                paymentRequested={paymentRequested}
                onPlaceOrder={() => { setMobileOrderOpen(false); setConfirmOrderOpen(true); }}
                onRemoveFromCart={(id) => setItemQty(id, -cart[id])}
                onAdjustCart={setItemQty}
                onRequestPayment={requestPayment}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Image preview modal ──────────────────────────────────────────────── */}
      {previewItem && <ImagePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}

      {/* ── Confirm order modal ──────────────────────────────────────────────── */}
      <Modal open={confirmOrderOpen} onClose={() => !orderLoading && setConfirmOrderOpen(false)} title="Xác nhận gọi món">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Bạn muốn gọi <strong className="text-gray-800">{cartCount} món</strong> với tổng{" "}
            <strong className="text-orange-500">{formatPrice(cartTotal)}</strong>?
          </p>
          <div className="max-h-48 overflow-y-auto space-y-2 rounded-2xl bg-gray-50 p-4">
            {cartItems.map(({ item, qty }) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 flex-1 truncate font-medium">{item.name}</span>
                <span className="text-gray-400 ml-2 text-xs">×{qty}</span>
                <span className="text-orange-500 font-semibold ml-3 w-24 text-right">{formatPrice(item.price * qty)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOrderOpen(false)} disabled={orderLoading}>Hủy</Button>
            <Button variant="primary" className="flex-1" loading={orderLoading} onClick={placeOrder}>Xác nhận gọi món</Button>
          </div>
        </div>
      </Modal>

      {/* ── Feedback popup (after payment) ──────────────────────────────────── */}
      {feedbackPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            {feedbackSubmitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🙏</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Cảm ơn bạn!</h3>
                <p className="text-gray-500 text-sm">Phản hồi của bạn rất quan trọng với chúng tôi.</p>
              </div>
            ) : (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Đánh giá trải nghiệm</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Chỉ mất 10 giây thôi!</p>
                  </div>
                  <button onClick={() => setFeedbackPopupOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0 ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  {/* Stars */}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Bạn cảm thấy thế nào?</p>
                    <div className="flex justify-center gap-2">
                      {[1,2,3,4,5].map((star) => (
                        <button key={star} onClick={() => setFeedbackRating(star)}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                          style={{ background: star <= feedbackRating ? "linear-gradient(135deg,#FED7AA,#FDBA74)" : "#F9FAFB" }}>
                          <span className={cn("text-2xl transition-all", star <= feedbackRating ? "text-orange-500" : "text-gray-300")}>
                            {star <= feedbackRating ? "★" : "☆"}
                          </span>
                        </button>
                      ))}
                    </div>
                    {feedbackRating > 0 && (
                      <p className="text-sm font-semibold text-orange-500 mt-2">
                        {["","Rất tệ","Tệ","Bình thường","Tốt","Rất tốt!"][feedbackRating]}
                      </p>
                    )}
                  </div>

                  {/* Comment */}
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Chia sẻ thêm... (không bắt buộc)"
                    rows={3}
                    className="w-full rounded-2xl border-2 border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-50 focus:outline-none px-4 py-3 text-sm placeholder-gray-300 resize-none bg-gray-50 focus:bg-white transition-all"
                  />

                  {feedbackError && <p className="text-xs text-red-500">{feedbackError}</p>}

                  <div className="flex gap-3">
                    <button onClick={() => setFeedbackPopupOpen(false)}
                      className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors">
                      Bỏ qua
                    </button>
                    <button onClick={submitFeedback} disabled={feedbackRating === 0 || feedbackSubmitting}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                      {feedbackSubmitting
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : "Gửi đánh giá"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Order Panel (shared desktop + mobile drawer) ─────────────────────────────

function OrderPanel({
  cartItems, orders, cartTotal, grandTotal,
  paymentLoading, paymentRequested,
  onPlaceOrder, onRemoveFromCart, onAdjustCart, onRequestPayment,
}: {
  cartItems: { item: MenuItem; qty: number }[];
  orders: Order[];
  cartTotal: number;
  grandTotal: number;
  paymentLoading: boolean;
  paymentRequested: boolean;
  onPlaceOrder: () => void;
  onRemoveFromCart: (id: string) => void;
  onAdjustCart: (id: string, delta: number) => void;
  onRequestPayment: () => void;
}) {
  const isEmpty = cartItems.length === 0 && orders.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50">
      <div className="flex-1 overflow-y-auto">
        {/* Cart section */}
        {cartItems.length > 0 && (
          <div className="p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Đang chọn</p>
            <div className="space-y-2">
              {cartItems.map(({ item, qty }) => (
                <div key={item.id} className="bg-white rounded-2xl px-3 py-2.5 flex items-center gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-orange-500 font-semibold">{formatPrice(item.price * qty)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => onAdjustCart(item.id, -1)}
                      className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-base font-bold transition-colors">
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-gray-800">{qty}</span>
                    <button onClick={() => onAdjustCart(item.id, 1)}
                      className="w-7 h-7 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-full flex items-center justify-center text-base font-bold transition-colors">
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart subtotal + place order */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Tạm tính</span>
                <span className="text-sm font-bold text-orange-500">{formatPrice(cartTotal)}</span>
              </div>
              <button onClick={onPlaceOrder}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-bold active:scale-[0.98] transition-all shadow-sm shadow-orange-200">
                Gọi món ngay
              </button>
            </div>
          </div>
        )}

        {/* Placed orders */}
        {orders.length > 0 && (
          <div className="p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Đã gọi</p>
            {orders.map((order, idx) => (
              <OrderCard key={order.id} order={order} index={orders.length - idx} />
            ))}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex justify-between items-center">
              <span className="text-sm text-gray-600 font-medium">Tổng cộng</span>
              <span className="text-lg font-black text-orange-500">{formatPrice(grandTotal)}</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mb-4">
              <span className="text-3xl">🛒</span>
            </div>
            <p className="text-gray-700 font-semibold">Chưa có món nào</p>
            <p className="text-gray-400 text-sm mt-1">Chọn món từ thực đơn bên trái nhé!</p>
          </div>
        )}
      </div>

      {/* Payment button */}
      {orders.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <button
            onClick={onRequestPayment}
            disabled={paymentLoading || paymentRequested}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl px-5 py-3.5 shadow-lg shadow-green-200 transition-all font-bold text-sm active:scale-[0.99]"
          >
            {paymentLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : paymentRequested ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Đã gọi thanh toán
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Gọi thanh toán
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Menu Card ────────────────────────────────────────────────────────────────

function MenuCard({ item, quantity, onAdd, onRemove, onPreview }: {
  item: MenuItem; quantity: number; onAdd: () => void; onRemove: () => void; onPreview: () => void;
}) {
  const firstImage = item.imageUrl ? item.imageUrl.split("|")[0] : null;
  const imageCount = item.imageUrl ? item.imageUrl.split("|").filter(Boolean).length : 0;

  return (
    <div className={cn(
      "bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md",
      quantity > 0 ? "ring-2 ring-orange-400 ring-offset-1" : "ring-1 ring-gray-100"
    )}>
      <div className="relative bg-gray-100 flex-shrink-0 cursor-pointer overflow-hidden" style={{ paddingBottom: "72%" }} onClick={onPreview}>
        <div className="absolute inset-0">
          {firstImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firstImage} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-4xl opacity-60">🍴</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200" />
        </div>
        {quantity > 0 && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">{quantity}</div>
        )}
        {imageCount > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-medium">1/{imageCount}</div>
        )}
        {!item.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1 rounded-full">Hết món</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1 cursor-pointer" onClick={onPreview}>
        <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">{item.name}</h3>
        {item.description && <p className="text-xs text-gray-400 line-clamp-2 flex-1 leading-relaxed">{item.description}</p>}
      </div>

      <div className="px-3 pb-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-bold text-orange-500">{formatPrice(item.price)}</span>
        {quantity === 0 ? (
          <button onClick={onAdd} disabled={!item.available}
            className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-sm shadow-orange-200 transition-all active:scale-95">
            +
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={onRemove} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-base font-bold transition-colors active:scale-95">−</button>
            <span className="w-5 text-center text-sm font-bold text-gray-800">{quantity}</span>
            <button onClick={onAdd} className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full flex items-center justify-center text-base font-bold transition-all shadow-sm shadow-orange-200 active:scale-95">+</button>
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
      <div className="flex items-start justify-between p-5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-white font-bold text-lg leading-tight">{item.name}</h3>
          {item.description && <p className="text-gray-400 text-sm mt-1">{item.description}</p>}
          <p className="text-orange-400 font-bold text-lg mt-1.5">{formatPrice(item.price)}</p>
        </div>
        <button onClick={onClose} className="ml-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative px-4" onClick={(e) => e.stopPropagation()}>
        {images.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[current]} alt={`${item.name} ${current + 1}`} className="max-h-full max-w-full object-contain rounded-2xl" />
            {images.length > 1 && (
              <>
                <button onClick={() => setCurrent((c) => (c > 0 ? c - 1 : images.length - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl font-bold">‹</button>
                <button onClick={() => setCurrent((c) => (c < images.length - 1 ? c + 1 : 0))} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl font-bold">›</button>
              </>
            )}
          </>
        ) : (
          <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center text-5xl">🍴</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-2 p-5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {images.map((url, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={cn("w-14 h-14 object-cover rounded-xl border-2 transition-all", idx === current ? "border-orange-500 scale-110 shadow-lg" : "border-transparent opacity-50")} />
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
  const statusDot: Record<string, string> = { pending: "bg-orange-400", done: "bg-emerald-400", cancelled: "bg-red-400" };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full shrink-0", statusDot[order.status] ?? "bg-gray-300")} />
          <p className="text-xs font-bold text-gray-700">Lần #{index}</p>
          <p className="text-xs text-gray-400">{formatDate(order.calledAt)}</p>
        </div>
        <Badge status={order.status} />
      </div>
      <div className="divide-y divide-gray-50">
        {order.items.map((it) => (
          <div key={it.id} className="px-3 py-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{it.menuItem.name}</p>
              <p className="text-xs text-gray-400">{formatPrice(it.priceAtOrder)} × {it.quantity}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge status={it.status} />
              <span className="text-xs font-bold text-gray-800 w-16 text-right">{formatPrice(it.priceAtOrder * it.quantity)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">Tổng lần này</span>
        <span className="text-xs font-bold text-orange-500">{formatPrice(orderTotal)}</span>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function TablePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TablePageInner />
    </Suspense>
  );
}
