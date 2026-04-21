import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const reservations = await prisma.reservation.findMany({
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    return NextResponse.json(reservations);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
