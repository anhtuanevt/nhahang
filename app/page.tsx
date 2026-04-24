"use client";

import { useState, useEffect, useRef } from "react";
import { formatPrice } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
}

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

const STATS = [
  { value: "6+", label: "Năm kinh nghiệm" },
  { value: "50+", label: "Món đặc trưng" },
  { value: "200+", label: "Chỗ ngồi" },
  { value: "4.8★", label: "Đánh giá trung bình" },
];

const FEATURES = [
  { icon: "🥩", label: "Thịt tươi hàng ngày" },
  { icon: "🌿", label: "Rau sạch Đà Lạt" },
  { icon: "🔥", label: "Bếp than hoa & điện" },
  { icon: "👨‍🍳", label: "Đầu bếp 10 năm kinh nghiệm" },
];

const TIMES = ["10:00","11:00","11:30","12:00","12:30","13:00","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00"];

const CATEGORY_ICONS: Record<string, string> = {
  "Đồ uống": "🥤",
  "Khai vị": "🥗",
  "Món chính": "🍖",
  "Tráng miệng": "🍮",
  "Khác": "✨",
};

export default function Home() {
  const menuRef = useRef<HTMLElement>(null);
  const reservationRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);

  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");

  // Menu
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tất cả");

  // Reservation
  const [form, setForm] = useState({ name: "", phone: "", date: "", time: "", guests: "2", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch("/api/public/menu")
      .then((r) => r.json())
      .then((d) => setMenuItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = [
      { id: "about", ref: aboutRef },
      { id: "menu", ref: menuRef },
      { id: "reservation", ref: reservationRef },
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(({ ref }) => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
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

  const categories = ["Tất cả", ...Array.from(new Set(menuItems.map((i) => i.category)))];
  const filteredItems = activeCategory === "Tất cả" ? menuItems : menuItems.filter((i) => i.category === activeCategory);
  const [minDate, setMinDate] = useState("");
  useEffect(() => {
    setMinDate(new Date().toISOString().slice(0, 10));
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white font-sans">

      {/* ── Header ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-[#0e0e0e]/95 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.06)]" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
              <span className="text-base">🔥</span>
            </div>
            <span className="font-semibold text-white tracking-wide text-lg">Đỗ Brothers</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {[
              { id: "about", label: "Giới thiệu", ref: aboutRef },
              { id: "menu", label: "Thực đơn", ref: menuRef },
              { id: "reservation", label: "Đặt bàn", ref: reservationRef },
            ].map(({ id, label, ref }) => (
              <button
                key={id}
                onClick={() => scrollTo(ref)}
                className={`relative px-4 py-2 rounded-full tracking-wide transition-all duration-300 ${
                  activeSection === id
                    ? "text-white"
                    : "text-white/45 hover:text-white/80"
                }`}
              >
                {activeSection === id && (
                  <span className="absolute inset-0 rounded-full bg-white/8 border border-white/10" />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </nav>

          <button
            onClick={() => scrollTo(reservationRef)}
            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-full transition-all text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
          >
            Đặt bàn ngay
          </button>

          {/* Mobile hamburger */}
          <button onClick={() => setNavOpen(!navOpen)} className="md:hidden p-2 text-white/70 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {navOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {navOpen && (
          <div className="md:hidden bg-[#111] border-t border-white/5 px-6 py-4 space-y-1">
            {[
              { id: "about", label: "Giới thiệu", ref: aboutRef },
              { id: "menu", label: "Thực đơn", ref: menuRef },
              { id: "reservation", label: "Đặt bàn", ref: reservationRef },
            ].map(({ id, label, ref }) => (
              <button
                key={id}
                onClick={() => scrollTo(ref)}
                className={`block w-full text-left px-4 py-3 text-sm rounded-xl transition-colors ${
                  activeSection === id
                    ? "text-amber-400 bg-amber-500/8 font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div className="absolute inset-0">
          <div className="absolute -top-40 right-0 w-[900px] h-[900px] bg-amber-600/[0.07] rounded-full blur-[140px]" />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-orange-500/[0.05] rounded-full blur-[80px]" />
          <div className="absolute bottom-0 -left-20 w-[600px] h-[400px] bg-amber-800/[0.06] rounded-full blur-[100px]" />
        </div>
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.018]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-32 pb-24 sm:pt-40 sm:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left — Text */}
            <div>
              <div className="inline-flex items-center gap-2.5 border border-amber-500/20 bg-amber-500/[0.07] text-amber-400/90 text-xs font-semibold px-4 py-2 rounded-full mb-10 tracking-[0.15em] uppercase">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                Đang mở cửa · {RESTAURANT.hours}
              </div>

              <h1 className="text-[clamp(3.5rem,8vw,6.5rem)] font-black tracking-tight leading-[0.88] mb-8">
                <span className="block text-white/90">Đỗ</span>
                <span className="block bg-gradient-to-r from-amber-300 via-orange-400 to-amber-400 bg-clip-text text-transparent pb-2">Brothers</span>
              </h1>

              <p className="text-white/40 text-base sm:text-lg leading-[1.8] mb-4 max-w-md">
                {RESTAURANT.tagline}
              </p>
              <p className="text-white/30 text-sm leading-relaxed mb-12 max-w-sm">
                {RESTAURANT.description}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => scrollTo(reservationRef)}
                  className="group flex items-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full transition-all text-sm shadow-2xl shadow-amber-500/20 hover:shadow-amber-400/35 active:scale-95"
                >
                  Đặt bàn ngay
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                <button
                  onClick={() => scrollTo(menuRef)}
                  className="px-7 py-3.5 border border-white/10 hover:border-white/25 text-white/55 hover:text-white/90 font-semibold rounded-full transition-all text-sm active:scale-95"
                >
                  Xem thực đơn
                </button>
              </div>

              {/* Mini stats row */}
              <div className="flex gap-8 mt-14 pt-10 border-t border-white/5">
                {STATS.slice(0, 3).map((s) => (
                  <div key={s.label}>
                    <div className="text-xl font-black text-amber-400">{s.value}</div>
                    <div className="text-white/25 text-xs mt-0.5 tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Visual */}
            <div className="hidden lg:flex justify-end items-center">
              <div className="relative w-[420px] h-[520px]">
                {/* Main card */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#1c1007] via-[#160d04] to-[#0e0e0e] border border-white/[0.06] overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[220px] opacity-[0.12] select-none">🔥</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />
                  {/* Glow inside */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                </div>

                {/* Float card — address */}
                <div className="absolute -left-10 top-10 bg-[#161616] border border-white/8 rounded-2xl px-5 py-4 shadow-2xl backdrop-blur-xl max-w-[200px]">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Địa chỉ</div>
                  <div className="text-xs text-white/75 leading-relaxed font-medium">{RESTAURANT.address}</div>
                </div>

                {/* Float card — rating */}
                <div className="absolute -right-8 top-1/3 bg-amber-500 rounded-2xl px-5 py-4 shadow-2xl shadow-amber-500/30">
                  <div className="text-2xl font-black text-black leading-none">4.8★</div>
                  <div className="text-[10px] text-black/50 mt-1 font-semibold tracking-wide uppercase">Google Reviews</div>
                </div>

                {/* Float card — hours */}
                <div className="absolute -left-8 bottom-16 bg-[#161616] border border-white/8 rounded-2xl px-5 py-4 shadow-2xl">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Giờ mở cửa</div>
                  <div className="text-sm font-bold text-white/80">{RESTAURANT.hours}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">Tất cả các ngày</div>
                </div>

                {/* Float card — year */}
                <div className="absolute right-4 bottom-8 bg-[#161616] border border-white/8 rounded-2xl px-4 py-3 shadow-2xl">
                  <div className="text-xl font-black text-amber-400">2018</div>
                  <div className="text-[10px] text-white/30 mt-0.5">Thành lập</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/15">
          <span className="text-[10px] uppercase tracking-[0.2em]">Khám phá</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>


      {/* ── About ── */}
      <section ref={aboutRef} className="py-24 sm:py-32" id="about">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Visual card */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1008] to-[#0e0e0e] border border-white/5 flex items-center justify-center">
                <span className="text-[180px] opacity-30 select-none">🔥</span>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />
              </div>
              {/* Float badges */}
              <div className="absolute -bottom-5 -left-5 bg-[#1a1a1a] border border-white/10 rounded-2xl px-5 py-4 shadow-2xl">
                <div className="text-2xl font-black text-amber-400">2018</div>
                <div className="text-xs text-white/40 mt-0.5">Năm thành lập</div>
              </div>
              <div className="absolute -top-5 -right-5 bg-amber-500 rounded-2xl px-5 py-4 shadow-2xl shadow-amber-500/30">
                <div className="text-2xl font-black text-black">4.8★</div>
                <div className="text-xs text-black/60 mt-0.5">Google Reviews</div>
              </div>
            </div>

            {/* Text */}
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] mb-4">Về chúng tôi</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-8">
                Hương vị nướng<br />
                <span className="text-amber-400">đậm chất Việt</span>
              </h2>
              <div className="space-y-5 text-white/50 leading-relaxed text-base">
                <p>
                  Đỗ Brothers ra đời từ niềm đam mê bếp núc của hai anh em họ Đỗ — với mong muốn mang lại trải nghiệm nướng tại bàn chất lượng cao nhưng gần gũi, phù hợp với khẩu vị người Việt.
                </p>
                <p>
                  Mỗi nguyên liệu đều được tuyển chọn kỹ: thịt bò Wagyu nhập Úc, hải sản tươi sống từ cảng, rau sạch từ Đà Lạt. Không gian nhà hàng ấm áp, phù hợp cho những buổi tụ họp gia đình hay bạn bè.
                </p>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-3">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-center gap-3 bg-white/[0.04] border border-white/5 rounded-xl px-4 py-3 hover:bg-white/[0.07] transition-colors">
                    <span className="text-lg">{f.icon}</span>
                    <span className="text-sm font-medium text-white/70">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Menu ── */}
      <section ref={menuRef} className="py-24 sm:py-32 bg-[#080808]" id="menu">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] mb-4">Thực đơn</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">Khám phá món ngon</h2>
          </div>

          {/* Category tabs */}
          {!menuLoading && categories.length > 1 && (
            <div className="flex gap-2 flex-wrap justify-center mb-10">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    activeCategory === cat
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25"
                      : "bg-white/[0.05] text-white/50 hover:text-white hover:bg-white/10 border border-white/5"
                  }`}
                >
                  {CATEGORY_ICONS[cat] && <span className="mr-1.5">{CATEGORY_ICONS[cat]}</span>}
                  {cat}
                </button>
              ))}
            </div>
          )}

          {menuLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <p className="text-5xl mb-4">🍽️</p>
              <p>Chưa có món nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
                >
                  {/* Image or placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-[#1a1008] to-[#111] flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-5xl opacity-20 group-hover:scale-110 transition-transform duration-300">
                        {CATEGORY_ICONS[item.category] || "🍽️"}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-white/90 text-sm leading-tight">{item.name}</h3>
                      <span className="text-amber-400 font-bold text-sm whitespace-nowrap shrink-0">{formatPrice(item.price)}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-white/35 leading-relaxed line-clamp-2">{item.description}</p>
                    )}
                    <div className="mt-3">
                      <span className="inline-block text-xs text-white/25 border border-white/10 rounded-full px-2.5 py-0.5">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Reservation ── */}
      <section ref={reservationRef} className="py-24 sm:py-32" id="reservation">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left */}
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] mb-4">Đặt bàn trước</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-8">
                Giữ chỗ cho<br />
                <span className="text-amber-400">bữa tiệc của bạn</span>
              </h2>
              <p className="text-white/40 leading-relaxed mb-10 text-base max-w-sm">
                Đặt bàn trước để đảm bảo chỗ ngồi vào giờ cao điểm. Chúng tôi sẽ xác nhận qua điện thoại trong vòng 30 phút.
              </p>
              <div className="space-y-5">
                {[
                  { icon: "📍", title: "Địa chỉ", value: RESTAURANT.address },
                  { icon: "🕐", title: "Giờ mở cửa", value: RESTAURANT.hours + " · Tất cả các ngày" },
                  { icon: "📞", title: "Điện thoại", value: RESTAURANT.phone },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-white/[0.04] border border-white/5 rounded-xl flex items-center justify-center text-base shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white/25 uppercase tracking-widest">{item.title}</div>
                      <div className="text-white/70 font-medium mt-1 text-sm">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-7 sm:p-9">
              {submitted ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">✅</div>
                  <h3 className="text-xl font-bold text-white mb-2">Đặt bàn thành công!</h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Chúng tôi sẽ gọi xác nhận trong vòng 30 phút.<br />
                    Cảm ơn bạn đã chọn Đỗ Brothers!
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-7 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-full text-sm font-bold transition-colors"
                  >
                    Đặt thêm
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReservation} className="space-y-5">
                  <h3 className="text-lg font-bold text-white mb-6">Thông tin đặt bàn</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Họ tên *</label>
                      <input
                        value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Nguyễn Văn A"
                        className="w-full rounded-xl bg-white/[0.05] border border-white/8 text-white placeholder-white/20 px-4 py-3 text-sm focus:border-amber-500/60 focus:outline-none focus:bg-white/[0.07] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Điện thoại *</label>
                      <input
                        value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="0901 234 567" type="tel"
                        className="w-full rounded-xl bg-white/[0.05] border border-white/8 text-white placeholder-white/20 px-4 py-3 text-sm focus:border-amber-500/60 focus:outline-none focus:bg-white/[0.07] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Ngày *</label>
                      <input
                        type="date" min={minDate} value={form.date}
                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full rounded-xl bg-white/[0.05] border border-white/8 text-white px-4 py-3 text-sm focus:border-amber-500/60 focus:outline-none focus:bg-white/[0.07] transition-colors [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Giờ *</label>
                      <select
                        value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                        className="w-full rounded-xl bg-white/[0.05] border border-white/8 text-white px-4 py-3 text-sm focus:border-amber-500/60 focus:outline-none focus:bg-white/[0.07] transition-colors [color-scheme:dark]"
                      >
                        <option value="" className="bg-[#1a1a1a]">Chọn giờ</option>
                        {TIMES.map((t) => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Số người *</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1,2,3,4,5,6,7,8].map((n) => (
                        <button
                          key={n} type="button"
                          onClick={() => setForm((f) => ({ ...f, guests: String(n) }))}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                            form.guests === String(n)
                              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25"
                              : "bg-white/[0.05] border border-white/8 text-white/50 hover:border-amber-500/40 hover:text-white"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <input
                        type="number" min="1" max="50" placeholder="Khác"
                        value={Number(form.guests) > 8 ? form.guests : ""}
                        onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
                        className="w-20 rounded-xl bg-white/[0.05] border border-white/8 text-white placeholder-white/20 px-3 py-2 text-sm text-center focus:border-amber-500/60 focus:outline-none [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Ghi chú</label>
                    <textarea
                      value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="Dị ứng thực phẩm, yêu cầu đặc biệt..."
                      rows={3}
                      className="w-full rounded-xl bg-white/[0.05] border border-white/8 text-white placeholder-white/20 px-4 py-3 text-sm focus:border-amber-500/60 focus:outline-none focus:bg-white/[0.07] transition-colors resize-none"
                    />
                  </div>

                  {formError && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{formError}</div>
                  )}

                  <button
                    type="submit" disabled={submitting}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-all text-sm shadow-xl shadow-amber-500/20 hover:shadow-amber-400/30 active:scale-[0.99]"
                  >
                    {submitting ? "Đang gửi..." : "Xác nhận đặt bàn"}
                  </button>
                  <p className="text-xs text-white/25 text-center">
                    Chúng tôi sẽ liên hệ xác nhận trong vòng 30 phút
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-[#080808] py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pb-10 border-b border-white/5">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-base">🔥</span>
                </div>
                <span className="font-bold text-white text-base">Đỗ Brothers</span>
              </div>
              <p className="text-white/30 text-sm leading-relaxed">{RESTAURANT.tagline}</p>
            </div>
            <div>
              <h4 className="text-white/60 font-semibold text-xs uppercase tracking-widest mb-5">Thông tin</h4>
              <ul className="space-y-3 text-sm text-white/30">
                <li>📍 {RESTAURANT.address}</li>
                <li>📞 {RESTAURANT.phone}</li>
                <li>🕐 {RESTAURANT.hours}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white/60 font-semibold text-xs uppercase tracking-widest mb-5">Điều hướng</h4>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => scrollTo(aboutRef)} className="text-white/30 hover:text-amber-400 transition-colors">Giới thiệu</button></li>
                <li><button onClick={() => scrollTo(menuRef)} className="text-white/30 hover:text-amber-400 transition-colors">Xem thực đơn</button></li>
                <li><button onClick={() => scrollTo(reservationRef)} className="text-white/30 hover:text-amber-400 transition-colors">Đặt bàn trước</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 text-center text-xs text-white/15">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Nhà hàng Đỗ Brothers. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
