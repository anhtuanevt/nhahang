import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const auth = req.cookies.get("admin_token");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tables, menuItems } = body;

    if (!tables || !menuItems) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Clear existing data
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.session.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.table.deleteMany();

    // Insert tables
    for (const table of tables) {
      await prisma.table.create({
        data: {
          number: table.number,
          name: table.name,
          password: table.password,
          status: table.status || "available",
          qrToken: table.qrToken || null,
        },
      });
    }

    // Insert menu items
    for (const item of menuItems) {
      await prisma.menuItem.create({
        data: {
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          available: item.available,
          imageUrl: item.imageUrl || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      tables: tables.length,
      menuItems: menuItems.length,
    });
  } catch (error) {
    console.error("Migrate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.cookies.get("admin_token");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tables = await prisma.table.findMany({
      select: {
        number: true,
        name: true,
        password: true,
        status: true,
        qrToken: true,
      },
    });

    const menuItems = await prisma.menuItem.findMany({
      select: {
        name: true,
        description: true,
        price: true,
        category: true,
        available: true,
        imageUrl: true,
      },
    });

    return NextResponse.json({ tables, menuItems });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
