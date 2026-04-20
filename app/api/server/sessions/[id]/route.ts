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

    if (status !== "paid") {
      return NextResponse.json(
        { error: "status must be 'paid'" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Session is not active" },
        { status: 409 }
      );
    }

    const updatedSession = await prisma.$transaction(async (tx) => {
      const sess = await tx.session.update({
        where: { id },
        data: { status: "paid", endedAt: new Date() },
        include: { table: true },
      });

      await tx.table.update({
        where: { id: session.tableId },
        data: { status: "ready" },
      });

      return sess;
    });

    broadcast("server", {
      type: "session_paid",
      sessionId: id,
      tableId: session.tableId,
      tableNumber: session.table.number,
    });

    broadcast(`table-${session.tableId}`, {
      type: "session_paid",
      sessionId: id,
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
