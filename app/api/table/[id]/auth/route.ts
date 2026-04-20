import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableNumber = parseInt(id, 10);

    if (isNaN(tableNumber)) {
      return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
    }

    const body = await req.json();
    const { password, qrToken } = body;

    if (!password && !qrToken) {
      return NextResponse.json(
        { error: "password or qrToken is required" },
        { status: 400 }
      );
    }

    let table;

    if (qrToken) {
      // Validate by qrToken and table number
      table = await prisma.table.findFirst({
        where: { qrToken, number: tableNumber },
      });
      if (!table) {
        return NextResponse.json({ error: "Invalid QR token" }, { status: 401 });
      }
    } else {
      // Validate by password
      table = await prisma.table.findUnique({
        where: { number: tableNumber },
      });
      if (!table) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }
      if (table.password !== password) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    // Supersede any existing active sessions
    await prisma.session.updateMany({
      where: { tableId: table.id, status: "active" },
      data: { status: "superseded", endedAt: new Date() },
    });

    // Create a new session
    const session = await prisma.session.create({
      data: {
        tableId: table.id,
        status: "active",
      },
    });

    // Update table status to occupied
    await prisma.table.update({
      where: { id: table.id },
      data: { status: "occupied" },
    });

    // Create JWT
    const token = await signToken({
      sessionId: session.id,
      tableId: table.id,
      tableNumber: table.number,
      role: "customer",
    });

    // Broadcast to server
    broadcast("server", {
      type: "table_occupied",
      tableId: table.id,
      tableNumber: table.number,
      sessionId: session.id,
    });

    const res = NextResponse.json({
      success: true,
      sessionId: session.id,
      tableId: table.id,
      tableNumber: table.number,
    });

    res.cookies.set("session_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
