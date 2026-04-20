import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import fs from "fs";
import "dotenv/config";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./dev.db";
const resolvedPath = path.isAbsolute(dbUrl)
  ? dbUrl
  : path.resolve(process.cwd(), dbUrl);
const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dataPath = process.argv[2] || "./local-data.json";
  
  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const { tables, menuItems } = data;

  console.log("Importing data from:", dataPath);
  console.log("- Tables:", tables.length);
  console.log("- Menu Items:", menuItems.length);

  console.log("\nClearing existing data...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.session.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.table.deleteMany();
  console.log("Done.");

  console.log("\nImporting tables...");
  for (const table of tables) {
    await prisma.table.create({
      data: {
        number: table.number,
        name: table.name,
        password: table.password,
        status: table.status || "ready",
        qrToken: table.qrToken,
      },
    });
  }
  console.log(`Inserted ${tables.length} tables.`);

  console.log("\nImporting menu items...");
  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        available: item.available,
        imageUrl: item.imageUrl,
      },
    });
  }
  console.log(`Inserted ${menuItems.length} menu items.`);

  console.log("\nDone! Data imported successfully.");
}

main()
  .catch((e) => {
    console.error("Import error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
