import { PrismaClient } from "../app/generated/prisma/client";
import fs from "fs";
import "dotenv/config";

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

console.log("TURSO_DATABASE_URL:", TURSO_DATABASE_URL);
console.log("TURSO_AUTH_TOKEN:", TURSO_AUTH_TOKEN ? "set" : "missing");

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const { createClient } = require("@libsql/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});
const adapter = new PrismaLibSql(client);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const dataPath = process.argv[2] || "./local-data.json";

  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const { tables, menuItems } = data;

  console.log("Syncing to Turso:", TURSO_DATABASE_URL);
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

  console.log("\nSyncing tables...");
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

  console.log("\nSyncing menu items...");
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

  console.log("\nDone! Data synced to Turso successfully.");
}

main()
  .catch((e) => {
    console.error("Sync error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
