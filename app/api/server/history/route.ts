import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerOrAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getServerOrAdminFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const sessions = await prisma.session.findMany({
      where: { startedAt: { gte: startOfDay, lte: endOfDay } },
      include: {
        table: { select: { number: true, name: true } },
        orders: {
          include: { items: { include: { menuItem: { select: { name: true } } } } },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
