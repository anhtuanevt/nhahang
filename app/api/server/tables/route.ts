import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerOrAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getServerOrAdminFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: "asc" },
      include: {
        sessions: {
          where: { status: "active" },
          take: 1,
          include: {
            orders: {
              where: { status: "pending" },
              select: { id: true },
            },
          },
        },
      },
    });

    const result = tables.map((table) => {
      const activeSession = table.sessions[0] ?? null;
      return {
        id: table.id,
        number: table.number,
        name: table.name,
        status: table.status,
        qrToken: table.qrToken,
        activeSession: activeSession
          ? {
              id: activeSession.id,
              startedAt: activeSession.startedAt,
              pendingOrdersCount: activeSession.orders.length,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
