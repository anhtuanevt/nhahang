import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      select: { id: true, number: true, name: true, status: true },
      orderBy: { number: "asc" },
    });
    return NextResponse.json(tables);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
