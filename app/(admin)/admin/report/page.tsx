"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

interface DailyRevenue { date: string; revenue: number; sessions: number; }
interface TopItem { name: string; totalQuantity: number; totalRevenue: number; }
interface TableStat { number: number; name: string | null; sessions: number; revenue: number; }
interface Summary { totalRevenue: number; totalSessions: number; totalItems: number; }
interface ReportData {
  summary: Summary;
  dailyRevenue: DailyRevenue[];
  topItems: TopItem[];
  tableStats: TableStat[];
}

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

const PRESETS = [
  { label: "7 ngày qua", days: 7 },
  { label: "30 ngày qua", days: 30 },
  { label: "90 ngày qua", days: 90 },
];

function formatShortDate(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

export default function ReportPage() {
  const router = useRouter();
  const [from, setFrom] = useState(toYMD(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(toYMD(new Date()));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchReport(f: string, t: string) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/report?from=${f}&to=${t}`, { credentials: "include" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) { setError("Không thể tải báo cáo"); return; }
      setData(await res.json());
    } catch { setError("Lỗi kết nối"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReport(from, to); }, []);

  function applyPreset(days: number) {
    const f = toYMD(new Date(Date.now() - (days - 1) * 86400000));
    const t = toYMD(new Date());
    setFrom(f); setTo(t);
    fetchReport(f, t);
  }

  const maxRevenue = data ? Math.max(...data.dailyRevenue.map((d) => d.revenue), 1) : 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo & Thống kê</h1>
          <p className="text-sm text-gray-500 mt-1">Phân tích doanh thu và lượng khách</p>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => applyPreset(p.days)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:border-orange-400 hover:text-orange-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 flex-wrap">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            <button
              onClick={() => fetchReport(from, to)}
              className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
            >
              Xem
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon="💰" label="Tổng doanh thu" value={formatPrice(data.summary.totalRevenue)} color="green" />
            <StatCard icon="👥" label="Lượt khách" value={String(data.summary.totalSessions)} color="blue" />
            <StatCard icon="🍽️" label="Tổng món đã bán" value={String(data.summary.totalItems)} color="orange" />
          </div>

          {/* Revenue chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Doanh thu theo ngày</h2>
            {data.dailyRevenue.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Không có dữ liệu</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-40 min-w-0" style={{ minWidth: `${data.dailyRevenue.length * 32}px` }}>
                  {data.dailyRevenue.map((d) => {
                    const pct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group min-w-[28px]">
                        <div className="relative w-full flex items-end justify-center" style={{ height: "120px" }}>
                          <div
                            className="w-full bg-orange-400 hover:bg-orange-500 rounded-t transition-colors cursor-default"
                            style={{ height: `${Math.max(pct, 2)}%` }}
                            title={`${d.date}: ${formatPrice(d.revenue)} (${d.sessions} khách)`}
                          />
                        </div>
                        <span className="text-xs text-gray-400 rotate-45 origin-left whitespace-nowrap" style={{ fontSize: "10px" }}>
                          {formatShortDate(d.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top items */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Top 10 món bán chạy</h2>
              {data.topItems.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Không có dữ liệu</p>
              ) : (
                <div className="space-y-3">
                  {data.topItems.map((item, idx) => {
                    const maxQty = data.topItems[0].totalQuantity;
                    const pct = (item.totalQuantity / maxQty) * 100;
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{idx + 1}</span>
                            <span className="text-sm text-gray-800 truncate">{item.name}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-sm font-semibold text-gray-800">{item.totalQuantity} phần</span>
                            <span className="text-xs text-gray-400 ml-2">{formatPrice(item.totalRevenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Table stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Thống kê theo bàn</h2>
              {data.tableStats.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Không có dữ liệu</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-600">Bàn</th>
                        <th className="text-center px-4 py-2.5 font-medium text-gray-600">Lượt khách</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-600">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.tableStats.map((t) => (
                        <tr key={t.number} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">
                            Bàn {t.number}
                            {t.name && t.name !== `Bàn ${t.number}` && (
                              <span className="text-gray-400 font-normal ml-1 text-xs">({t.name})</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600">{t.sessions}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-orange-600">{formatPrice(t.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Daily breakdown table */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Chi tiết doanh thu theo ngày</h2>
            {data.dailyRevenue.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Không có dữ liệu</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Ngày</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-600">Lượt khách</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...data.dailyRevenue].reverse().map((d) => (
                      <tr key={d.date} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-800">{d.date}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{d.sessions}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-orange-600">{formatPrice(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-gray-700">Tổng cộng</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-gray-700">{data.summary.totalSessions}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-orange-600">{formatPrice(data.summary.totalRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: "green" | "blue" | "orange" }) {
  const colors = { green: "bg-green-50 text-green-700", blue: "bg-blue-50 text-blue-700", orange: "bg-orange-50 text-orange-700" };
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-xl font-bold ${color === "green" ? "text-green-700" : color === "blue" ? "text-blue-700" : "text-orange-600"}`}>{value}</p>
      </div>
    </div>
  );
}
