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

    // Update table status to payment_requested
    await prisma.table.update({
      where: { id: session.tableId },
      data: { status: "payment_requested" },
    });

    broadcast("server", {
      type: "payment_requested",
      tableId: session.tableId,
      tableNumber: session.table.number,
      sessionId: session.id,
    });

    broadcast(`table-${session.tableId}`, {
      type: "payment_requested",
      sessionId: session.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
