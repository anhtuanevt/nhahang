import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const auth = req.cookies.get("admin_token");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingTables = await prisma.table.count();
    if (existingTables > 0) {
      return NextResponse.json({ message: "Database already seeded", tables: existingTables });
    }

    for (let n = 1; n <= 10; n++) {
      await prisma.table.create({
        data: {
          number: n,
          name: `Bàn ${n}`,
          password: `table${n}`,
        },
      });
    }

    const menuItems = [
      { name: "Trà đá", description: "Trà đá mát lạnh", price: 10000, category: "Đồ uống", available: true },
      { name: "Nước ngọt Coca Cola", description: "Coca Cola lon 330ml", price: 20000, category: "Đồ uống", available: true },
      { name: "Nước cam ép", description: "Cam ép tươi nguyên chất", price: 35000, category: "Đồ uống", available: true },
      { name: "Cà phê đen", description: "Cà phê phin truyền thống", price: 25000, category: "Đồ uống", available: true },
      { name: "Sinh tố bơ", description: "Sinh tố bơ béo ngậy", price: 45000, category: "Đồ uống", available: true },
      { name: "Gỏi cuốn tôm thịt", description: "Gỏi cuốn tươi với tôm và thịt heo", price: 55000, category: "Khai vị", available: true },
      { name: "Chả giò chiên", description: "Chả giò giòn rụm nhân thịt và rau củ", price: 65000, category: "Khai vị", available: true },
      { name: "Salad rau trộn", description: "Salad rau tươi trộn dầu mè", price: 50000, category: "Khai vị", available: true },
      { name: "Súp bí đỏ", description: "Súp bí đỏ kem mịn béo", price: 45000, category: "Khai vị", available: true },
      { name: "Cơm sườn nướng", description: "Cơm trắng với sườn heo nướng thơm", price: 85000, category: "Món chính", available: true },
      { name: "Phở bò tái", description: "Phở bò tái hành tươi", price: 75000, category: "Món chính", available: true },
      { name: "Bún bò Huế", description: "Bún bò Huế cay nồng đặc trưng", price: 70000, category: "Món chính", available: true },
      { name: "Cá kho tộ", description: "Cá catfish kho tộ đậm đà", price: 95000, category: "Món chính", available: true },
      { name: "Lẩu thập cẩm (2 người)", description: "Lẩu hải sản thập cẩm cho 2 người", price: 250000, category: "Món chính", available: true },
      { name: "Cơm chiên dương châu", description: "Cơm chiên trứng với tôm, xá xíu", price: 65000, category: "Món chính", available: true },
      { name: "Mì xào hải sản", description: "Mì xào giòn với tôm, mực", price: 90000, category: "Món chính", available: true },
      { name: "Chè đậu xanh", description: "Chè đậu xanh nước dừa mát lạnh", price: 30000, category: "Tráng miệng", available: true },
      { name: "Kem ba màu", description: "Kem ly ba màu đặc trưng Việt Nam", price: 35000, category: "Tráng miệng", available: true },
      { name: "Bánh flan caramel", description: "Bánh flan mềm mịn với caramel", price: 40000, category: "Tráng miệng", available: true },
      { name: "Trái cây theo mùa", description: "Đĩa trái cây tươi theo mùa", price: 55000, category: "Tráng miệng", available: true },
    ];

    for (const item of menuItems) {
      await prisma.menuItem.create({ data: item });
    }

    await prisma.setting.upsert({
      where: { key: "restaurantName" },
      update: { value: "Nhà Hàng Demo" },
      create: { key: "restaurantName", value: "Nhà Hàng Demo" },
    });

    await prisma.setting.upsert({
      where: { key: "currency" },
      update: { value: "VND" },
      create: { key: "currency", value: "VND" },
    });

    return NextResponse.json({ success: true, message: "Database seeded successfully", tables: 10, menuItems: menuItems.length });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
