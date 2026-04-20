import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerOrAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getServerOrAdminFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const tableId = searchParams.get("tableId");

    const where: any = { status: "pending" };
    if (tableId) {
      where.tableId = tableId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        session: {
          include: {
            table: true,
          },
        },
      },
      orderBy: { calledAt: "asc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
