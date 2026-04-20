import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: "asc" },
      include: {
        sessions: {
          where: { status: "active" },
          take: 1,
          include: {
            orders: {
              where: { status: "pending" },
              include: { items: true },
            },
          },
        },
      },
    });

    return NextResponse.json(tables);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { number, name, password } = await req.json();

    if (!number || !password) {
      return NextResponse.json({ error: "number and password are required" }, { status: 400 });
    }

    const qrToken = uuidv4();

    const table = await prisma.table.create({
      data: {
        number: Number(number),
        name: name ?? null,
        password,
        qrToken,
      },
    });

    return NextResponse.json(table, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Table number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
