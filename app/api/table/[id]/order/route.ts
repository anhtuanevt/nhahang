import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionAuth = await getSessionFromRequest(req);
  if (!sessionAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const tableNumber = parseInt(id, 10);

    // Verify session is active and matches the table
    const session = await prisma.session.findUnique({
      where: { id: sessionAuth.sessionId },
      include: { table: true },
    });

    if (!session || session.status !== "active") {
      return NextResponse.json({ error: "Session is not active" }, { status: 401 });
    }

    if (session.tableId !== sessionAuth.tableId) {
      return NextResponse.json({ error: "Session does not match table" }, { status: 403 });
    }

    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    // Fetch current prices for all menu items
    const menuItemIds = items.map((item: { menuItemId: string }) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, available: true },
    });

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Validate all items exist and are available
    for (const item of items) {
      if (!menuItemMap.has(item.menuItemId)) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found or not available` },
          { status: 400 }
        );
      }
    }

    const order = await prisma.order.create({
      data: {
        sessionId: session.id,
        tableId: session.tableId,
        status: "pending",
        items: {
          create: items.map((item: { menuItemId: string; quantity: number }) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            priceAtOrder: menuItemMap.get(item.menuItemId)!.price,
            status: "pending",
          })),
        },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
    });

    broadcast("server", {
      type: "new_order",
      tableId: session.tableId,
      tableNumber: session.table.number,
      orderId: order.id,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionAuth = await getSessionFromRequest(req);
  if (!sessionAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify session is active
    const session = await prisma.session.findUnique({
      where: { id: sessionAuth.sessionId },
    });

    if (!session || session.status !== "active") {
      return NextResponse.json({ error: "Session is not active" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { sessionId: session.id },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { calledAt: "desc" },
    });

    // Compute totals per order
    const ordersWithTotals = orders.map((order) => ({
      ...order,
      total: order.items.reduce(
        (sum, item) => sum + item.priceAtOrder * item.quantity,
        0
      ),
    }));

    const sessionTotal = ordersWithTotals.reduce((sum, o) => sum + o.total, 0);

    return NextResponse.json({ orders: ordersWithTotals, sessionTotal });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
