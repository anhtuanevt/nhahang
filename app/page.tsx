"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Table { id: string; number: number; name: string; status: string; }

const RESTAURANT = {
  name: "Đỗ Brothers",
  tagline: "Nướng tại bàn — Thịt tươi chuẩn vị",
  description:
    "Trải nghiệm ẩm thực nướng tại bàn với thịt bò Mỹ, hải sản tươi sống và hơn 50 loại nước chấm đặc biệt. Không gian ấm cúng, phù hợp cho gia đình và nhóm bạn.",
  address: "45 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
  phone: "0901 234 567",
  hours: "10:00 – 22:30",
  founded: "2018",
};

const SIGNATURES = [
  { emoji: "🥩", name: "Ba chỉ bò Wagyu", desc: "Nhập khẩu Úc, mềm tan, vân mỡ đều", price: "189.000₫" },
  { emoji: "🦐", name: "Tôm sú nướng bơ tỏi", desc: "Tôm tươi size jumbo, sốt bơ thơm lừng", price: "159.000₫" },
  { emoji: "🐙", name: "Bạch tuộc sa tế", desc: "Đặc sản biển, nướng than hoa giòn dai", price: "129.000₫" },
  { emoji: "🍖", name: "Sườn non heo Iberico", desc: "Heo nhập từ Tây Ban Nha, béo ngậy", price: "145.000₫" },
];

const STATS = [
  { value: "6+", label: "Năm kinh nghiệm" },
  { value: "50+", label: "Món đặc trưng" },
  { value: "200+", label: "Chỗ ngồi" },
  { value: "4.8★", label: "Đánh giá trung bình" },
];

const TIMES = ["10:00","11:00","11:30","12:00","12:30","13:00","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00"];

export default function Home() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const reservationRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLElement>(null);

  // Reservation form
  const [form, setForm] = useState({ name: "", phone: "", date: "", time: "", guests: "2", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  // Mobile nav
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    fetch("/api/public/tables")
      .then((r) => r.json())
      .then((d) => setTables(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setTablesLoading(false));
  }, []);

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setNavOpen(false);
  }

  async function handleReservation(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.phone || !form.date || !form.time) {
      setFormError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guests: Number(form.guests) }),
      });
      if (res.ok) {
        setSubmitted(true);
        setForm({ name: "", phone: "", date: "", time: "", guests: "2", note: "" });
      } else {
        const d = await res.json();
        setFormError(d.error || "Không thể gửi đặt bàn");
      }
    } catch {
      setFormError("Lỗi kết nối, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusConfig = (status: string) => {
    if (status === "occupied") return { dot: "bg-orange-400", label: "Đang có khách", card: "border-orange-200 bg-orange-50" };
    return { dot: "bg-emerald-400", label: "Trống", card: "border-gray-200 bg-white" };
  };

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Fixed Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-lg">🔥</span>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Đỗ Brothers</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <button onClick={() => scrollTo(reservationRef)} className="hover:text-orange-600 transition-colors">Đặt bàn</button>
            <button onClick={() => scrollTo(tableRef)} className="hover:text-orange-600 transition-colors">Vào thực đơn</button>
            <button onClick={() => router.push("/admin/login")} className="hover:text-orange-600 transition-colors">Quản trị</button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => scrollTo(reservationRef)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              Đặt bàn ngay
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setNavOpen(!navOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {navOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {navOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <button onClick={() => scrollTo(reservationRef)} className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg">Đặt bàn</button>
            <button onClick={() => scrollTo(tableRef)} className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg">Vào thực đơn</button>
            <button onClick={() => router.push("/admin/login")} className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg">Quản trị</button>
            <button onClick={() => router.push("/server/login")} className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg">Nhân viên</button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-16 min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900">
        {/* Decoration blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-32 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/5 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 sm:py-32 text-white">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              Mở cửa hôm nay · {RESTAURANT.hours}
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6">
              <span className="text-white">Đỗ</span>
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Brothers</span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-300 font-medium mb-4">{RESTAURANT.tagline}</p>
            <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-10 max-w-xl">{RESTAURANT.description}</p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo(reservationRef)}
                className="px-6 py-3.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/30 text-base"
              >
                Đặt bàn ngay
              </button>
              <button
                onClick={() => scrollTo(tableRef)}
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-all active:scale-95 backdrop-blur-sm text-base"
              >
                Xem thực đơn
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-orange-500 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-white text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-3xl sm:text-4xl font-black">{s.value}</div>
                <div className="text-orange-100 text-sm mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Visual */}
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center text-[120px] sm:text-[160px] shadow-xl overflow-hidden">
                🔥
                <div className="absolute inset-0 bg-gradient-to-t from-orange-100/40 to-transparent" />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl px-5 py-3 border border-gray-100">
                <div className="text-2xl font-black text-orange-500">2018</div>
                <div className="text-xs text-gray-500 font-medium">Năm thành lập</div>
              </div>
              <div className="absolute -top-4 -left-4 bg-orange-500 rounded-2xl shadow-xl px-5 py-3 text-white">
                <div className="text-2xl font-black">4.8★</div>
                <div className="text-xs text-orange-100 font-medium">Google Reviews</div>
              </div>
            </div>

            {/* Content */}
            <div>
              <p className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-3">Về chúng tôi</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-6">
                Hương vị nướng<br />
                <span className="text-orange-500">đậm chất Việt</span>
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Đỗ Brothers ra đời từ niềm đam mê bếp núc của hai anh em họ Đỗ — với mong muốn mang lại trải nghiệm nướng tại bàn chất lượng cao nhưng gần gũi, phù hợp với khẩu vị người Việt.
                </p>
                <p>
                  Mỗi nguyên liệu đều được tuyển chọn kỹ: thịt bò Wagyu nhập Úc, hải sản tươi sống từ cảng, rau sạch từ Đà Lạt. Không gian nhà hàng ấm áp, phù hợp cho những buổi tụ họp gia đình hay bạn bè.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[
                  { icon: "🥩", label: "Thịt tươi hàng ngày" },
                  { icon: "🌿", label: "Rau sạch Đà Lạt" },
                  { icon: "🔥", label: "Bếp than hoa & điện" },
                  { icon: "👨‍🍳", label: "Đầu bếp 10 năm kinh nghiệm" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Signature Dishes ── */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-3">Thực đơn nổi bật</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Món được yêu thích nhất</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SIGNATURES.map((dish) => (
              <div key={dish.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-300">
                  {dish.emoji}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{dish.name}</h3>
                  <p className="text-sm text-gray-500 mb-3 leading-relaxed">{dish.desc}</p>
                  <div className="text-orange-600 font-bold">{dish.price}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-sm mt-8">
            Hơn 50 món · Thực đơn đầy đủ có tại bàn
          </p>
        </div>
      </section>

      {/* ── Reservation ── */}
      <section ref={reservationRef} className="py-20 sm:py-28 bg-white" id="reservation">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left side info */}
            <div>
              <p className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-3">Đặt bàn trước</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-6">
                Giữ chỗ cho<br />
                <span className="text-orange-500">bữa tiệc của bạn</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                Đặt bàn trước để đảm bảo chỗ ngồi vào giờ cao điểm. Chúng tôi sẽ xác nhận qua điện thoại trong vòng 30 phút.
              </p>
              <div className="space-y-4">
                {[
                  { icon: "📍", title: "Địa chỉ", value: RESTAURANT.address },
                  { icon: "🕐", title: "Giờ mở cửa", value: RESTAURANT.hours + " (Tất cả các ngày)" },
                  { icon: "📞", title: "Điện thoại", value: RESTAURANT.phone },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-lg shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{item.title}</div>
                      <div className="text-gray-800 font-medium mt-0.5">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reservation form */}
            <div className="bg-gray-50 rounded-3xl p-6 sm:p-8 border border-gray-100">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Đặt bàn thành công!</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Chúng tôi sẽ gọi xác nhận trong vòng 30 phút.
                    <br />Cảm ơn bạn đã chọn Đỗ Brothers!
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Đặt thêm
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReservation} className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Thông tin đặt bàn</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ tên *</label>
                      <input
                        value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Nguyễn Văn A"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại *</label>
                      <input
                        value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="0901 234 567" type="tel"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày *</label>
                      <input
                        type="date" min={minDate} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Giờ *</label>
                      <select
                        value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Chọn giờ</option>
                        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Số người *</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1,2,3,4,5,6,7,8].map((n) => (
                        <button
                          key={n} type="button"
                          onClick={() => setForm((f) => ({ ...f, guests: String(n) }))}
                          className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                            form.guests === String(n)
                              ? "bg-orange-500 text-white shadow-sm"
                              : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <input
                        type="number" min="1" max="50" placeholder="Khác"
                        value={Number(form.guests) > 8 ? form.guests : ""}
                        onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
                        className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-center focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú (tuỳ chọn)</label>
                    <textarea
                      value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="Dị ứng thực phẩm, yêu cầu đặc biệt..."
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none"
                    />
                  </div>

                  {formError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
                  )}

                  <button
                    type="submit" disabled={submitting}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-sm shadow-orange-200 text-sm"
                  >
                    {submitting ? "Đang gửi..." : "Xác nhận đặt bàn"}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Chúng tôi sẽ liên hệ xác nhận trong vòng 30 phút
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── In-restaurant Table Selection ── */}
      <section ref={tableRef} className="py-20 sm:py-28 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500" id="tables">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-sm font-bold text-orange-100 uppercase tracking-widest mb-3">Đang có mặt tại nhà hàng?</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">Chọn bàn & Gọi món ngay</h2>
            <p className="text-orange-100">Chọn bàn của bạn hoặc quét mã QR trên bàn</p>
          </div>

          {tablesLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tables.length === 0 ? (
            <p className="text-center text-orange-100 py-8">Chưa có bàn nào</p>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {tables.map((table) => {
                  const cfg = getStatusConfig(table.status);
                  return (
                    <button
                      key={table.id}
                      onClick={() => router.push(`/table/${table.number}`)}
                      className={`relative border-2 ${cfg.card} hover:border-orange-400 hover:bg-orange-50 rounded-2xl p-4 transition-all duration-200 flex flex-col items-center gap-2 group active:scale-95 bg-white/95 backdrop-blur-sm border-white/50`}
                    >
                      <div className="relative">
                        <div className="w-11 h-11 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center text-2xl transition-colors">🪑</div>
                        <div className={`absolute -top-1 -right-1 w-3 h-3 ${cfg.dot} rounded-full border-2 border-white shadow-sm`} />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-800 text-sm leading-tight">{table.name || `Bàn ${table.number}`}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{cfg.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-10 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🔥</span>
                </div>
                <span className="font-bold text-white text-lg">Đỗ Brothers</span>
              </div>
              <p className="text-sm leading-relaxed">{RESTAURANT.tagline}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Thông tin</h4>
              <ul className="space-y-2 text-sm">
                <li>📍 {RESTAURANT.address}</li>
                <li>📞 {RESTAURANT.phone}</li>
                <li>🕐 {RESTAURANT.hours}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Truy cập</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollTo(reservationRef)} className="hover:text-orange-400 transition-colors">Đặt bàn trước</button></li>
                <li><button onClick={() => scrollTo(tableRef)} className="hover:text-orange-400 transition-colors">Vào thực đơn</button></li>
                <li><button onClick={() => router.push("/admin/login")} className="hover:text-orange-400 transition-colors">Quản trị viên</button></li>
                <li><button onClick={() => router.push("/server/login")} className="hover:text-orange-400 transition-colors">Nhân viên phục vụ</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} Nhà hàng Đỗ Brothers. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
