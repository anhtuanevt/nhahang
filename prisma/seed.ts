import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import "dotenv/config";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ?? "./dev.db";
const resolvedPath = path.isAbsolute(dbUrl)
  ? dbUrl
  : path.resolve(process.cwd(), dbUrl);
const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create 10 tables
  for (let n = 1; n <= 10; n++) {
    await prisma.table.upsert({
      where: { number: n },
      update: {},
      create: {
        number: n,
        name: `Bàn ${n}`,
        password: `table${n}`,
      },
    });
  }
  console.log("Created 10 tables");

  // Create 20 sample menu items
  const menuItems = [
    // Đồ uống (5 items)
    {
      name: "Trà đá",
      description: "Trà đá mát lạnh",
      price: 10000,
      category: "Đồ uống",
      available: true,
    },
    {
      name: "Nước ngọt Coca Cola",
      description: "Coca Cola lon 330ml",
      price: 20000,
      category: "Đồ uống",
      available: true,
    },
    {
      name: "Nước cam ép",
      description: "Cam ép tươi nguyên chất",
      price: 35000,
      category: "Đồ uống",
      available: true,
    },
    {
      name: "Cà phê đen",
      description: "Cà phê phin truyền thống",
      price: 25000,
      category: "Đồ uống",
      available: true,
    },
    {
      name: "Sinh tố bơ",
      description: "Sinh tố bơ béo ngậy",
      price: 45000,
      category: "Đồ uống",
      available: true,
    },
    // Khai vị (4 items)
    {
      name: "Gỏi cuốn tôm thịt",
      description: "Gỏi cuốn tươi với tôm và thịt heo, chấm tương hoisin",
      price: 55000,
      category: "Khai vị",
      available: true,
    },
    {
      name: "Chả giò chiên",
      description: "Chả giò giòn rụm nhân thịt và rau củ",
      price: 65000,
      category: "Khai vị",
      available: true,
    },
    {
      name: "Salad rau trộn",
      description: "Salad rau tươi trộn dầu mè",
      price: 50000,
      category: "Khai vị",
      available: true,
    },
    {
      name: "Súp bí đỏ",
      description: "Súp bí đỏ kem mịn béo",
      price: 45000,
      category: "Khai vị",
      available: true,
    },
    // Món chính (7 items)
    {
      name: "Cơm sườn nướng",
      description: "Cơm trắng với sườn heo nướng thơm, dưa leo, cà chua",
      price: 85000,
      category: "Món chính",
      available: true,
    },
    {
      name: "Phở bò tái",
      description: "Phở bò tái hành tươi, nước dùng trong",
      price: 75000,
      category: "Món chính",
      available: true,
    },
    {
      name: "Bún bò Huế",
      description: "Bún bò Huế cay nồng đặc trưng",
      price: 70000,
      category: "Món chính",
      available: true,
    },
    {
      name: "Cá kho tộ",
      description: "Cá catfish kho tộ đậm đà, ăn kèm cơm trắng",
      price: 95000,
      category: "Món chính",
      available: true,
    },
    {
      name: "Lẩu thập cẩm (2 người)",
      description: "Lẩu hải sản thập cẩm cho 2 người",
      price: 250000,
      category: "Món chính",
      available: true,
    },
    {
      name: "Cơm chiên dương châu",
      description: "Cơm chiên trứng với tôm, xá xíu và rau củ",
      price: 65000,
      category: "Món chính",
      available: true,
    },
    {
      name: "Mì xào hải sản",
      description: "Mì xào giòn với tôm, mực và sốt hải sản",
      price: 90000,
      category: "Món chính",
      available: true,
    },
    // Tráng miệng (4 items)
    {
      name: "Chè đậu xanh",
      description: "Chè đậu xanh nước dừa mát lạnh",
      price: 30000,
      category: "Tráng miệng",
      available: true,
    },
    {
      name: "Kem ba màu",
      description: "Kem ly ba màu đặc trưng Việt Nam",
      price: 35000,
      category: "Tráng miệng",
      available: true,
    },
    {
      name: "Bánh flan caramel",
      description: "Bánh flan mềm mịn với lớp caramel ngọt",
      price: 40000,
      category: "Tráng miệng",
      available: true,
    },
    {
      name: "Trái cây theo mùa",
      description: "Đĩa trái cây tươi theo mùa",
      price: 55000,
      category: "Tráng miệng",
      available: true,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }
  console.log(`Created ${menuItems.length} menu items`);

  // Create initial settings
  const settings = [
    { key: "restaurantName", value: "Nhà Hàng Demo" },
    { key: "currency", value: "VND" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log("Created initial settings");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
