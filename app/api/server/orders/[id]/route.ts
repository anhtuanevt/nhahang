import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerOrAdminFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getServerOrAdminFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!status || !["done", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'done' or 'cancelled'" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, session: { include: { table: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order and mark all pending items as same status if done
    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (status === "done") {
        await tx.orderItem.updateMany({
          where: { orderId: id, status: "pending" },
          data: { status: "done" },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status },
        include: {
          items: { include: { menuItem: true } },
          session: { include: { table: true } },
        },
      });
    });

    const tableId = order.tableId;
    const tableNumber = order.session.table.number;

    broadcast("server", {
      type: "order_updated",
      orderId: id,
      status,
      tableId,
      tableNumber,
    });

    broadcast(`table-${tableId}`, {
      type: "order_updated",
      orderId: id,
      status,
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
