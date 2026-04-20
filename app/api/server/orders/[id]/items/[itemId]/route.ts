import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerOrAdminFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await getServerOrAdminFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, itemId } = await params;
    const { status } = await req.json();

    if (!status || !["done", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'done' or 'cancelled'" },
        { status: 400 }
      );
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: {
          include: { session: { include: { table: true } } },
        },
      },
    });

    if (!item || item.orderId !== id) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { menuItem: true },
    });

    const tableId = item.order.tableId;
    const tableNumber = item.order.session.table.number;

    broadcast("server", {
      type: "item_updated",
      orderId: id,
      itemId,
      status,
      tableId,
      tableNumber,
    });

    broadcast(`table-${tableId}`, {
      type: "item_updated",
      orderId: id,
      itemId,
      status,
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
