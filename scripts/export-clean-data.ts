import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import "dotenv/config";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./dev.db";
const resolvedPath = path.isAbsolute(dbUrl)
  ? dbUrl
  : path.resolve(process.cwd(), dbUrl);
const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tables = await prisma.table.findMany({
    select: {
      number: true,
      name: true,
      password: true,
      status: true,
      qrToken: true,
    },
    orderBy: { number: "asc" },
  });

  const allMenuItems = await prisma.menuItem.findMany({
    select: {
      name: true,
      description: true,
      price: true,
      category: true,
      available: true,
      imageUrl: true,
    },
  });

  // Remove duplicates by name
  const seen = new Set<string>();
  const menuItems = allMenuItems.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });

  const data = { tables, menuItems };

  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
