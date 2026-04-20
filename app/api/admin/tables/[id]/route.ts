import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { number, name, password } = await req.json();

    const existing = await prisma.table.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const updated = await prisma.table.update({
      where: { id },
      data: {
        ...(number !== undefined && { number: Number(number) }),
        ...(name !== undefined && { name }),
        ...(password !== undefined && { password }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Table number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.table.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Check for active sessions
    const activeSession = await prisma.session.findFirst({
      where: { tableId: id, status: "active" },
    });

    if (activeSession) {
      return NextResponse.json(
        { error: "Cannot delete table with active sessions" },
        { status: 409 }
      );
    }

    await prisma.table.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
