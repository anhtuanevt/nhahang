import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const fromDate = from ? new Date(from) : new Date(Date.now() - 29 * 86400000);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);

  try {
    const sessions = await prisma.session.findMany({
      where: { startedAt: { gte: fromDate, lte: toDate } },
      include: {
        table: true,
        orders: {
          include: { items: { include: { menuItem: true } } },
        },
      },
      orderBy: { startedAt: "asc" },
    });

    // --- Daily revenue ---
    const dailyMap = new Map<string, { revenue: number; sessions: number }>();
    for (const s of sessions) {
      const day = s.startedAt.toISOString().slice(0, 10);
      const rev = s.orders
        .flatMap((o) => o.items)
        .reduce((sum, i) => sum + i.priceAtOrder * i.quantity, 0);
      const existing = dailyMap.get(day) ?? { revenue: 0, sessions: 0 };
      dailyMap.set(day, { revenue: existing.revenue + rev, sessions: existing.sessions + 1 });
    }
    // Fill every day in range, even days with no revenue
    const dailyRevenue: { date: string; revenue: number; sessions: number }[] = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      const day = cursor.toISOString().slice(0, 10);
      const v = dailyMap.get(day) ?? { revenue: 0, sessions: 0 };
      dailyRevenue.push({ date: day, ...v });
      cursor.setDate(cursor.getDate() + 1);
    }

    // --- Top items ---
    const itemMap = new Map<string, { name: string; totalQuantity: number; totalRevenue: number }>();
    for (const s of sessions) {
      for (const o of s.orders) {
        for (const i of o.items) {
          const key = i.menuItemId;
          const existing = itemMap.get(key) ?? { name: i.menuItem.name, totalQuantity: 0, totalRevenue: 0 };
          itemMap.set(key, {
            name: i.menuItem.name,
            totalQuantity: existing.totalQuantity + i.quantity,
            totalRevenue: existing.totalRevenue + i.priceAtOrder * i.quantity,
          });
        }
      }
    }
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // --- Table stats ---
    const tableMap = new Map<string, { number: number; name: string | null; sessions: number; revenue: number }>();
    for (const s of sessions) {
      const key = s.tableId;
      const rev = s.orders.flatMap((o) => o.items).reduce((sum, i) => sum + i.priceAtOrder * i.quantity, 0);
      const existing = tableMap.get(key) ?? { number: s.table.number, name: s.table.name, sessions: 0, revenue: 0 };
      tableMap.set(key, { ...existing, sessions: existing.sessions + 1, revenue: existing.revenue + rev });
    }
    const tableStats = Array.from(tableMap.values()).sort((a, b) => a.number - b.number);

    // --- Summary ---
    const totalRevenue = sessions.reduce(
      (sum, s) => sum + s.orders.flatMap((o) => o.items).reduce((s2, i) => s2 + i.priceAtOrder * i.quantity, 0),
      0
    );
    const totalItems = sessions.reduce(
      (sum, s) => sum + s.orders.flatMap((o) => o.items).reduce((s2, i) => s2 + i.quantity, 0),
      0
    );

    return NextResponse.json({
      summary: { totalRevenue, totalSessions: sessions.length, totalItems },
      dailyRevenue,
      topItems,
      tableStats,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
