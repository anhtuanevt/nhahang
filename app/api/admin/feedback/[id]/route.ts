import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["unread", "read", "resolved"].includes(status)) {
    return NextResponse.json({ error: "status không hợp lệ" }, { status: 400 });
  }

  const feedback = await prisma.feedback.update({ where: { id }, data: { status } });
  return NextResponse.json(feedback);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.feedback.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
