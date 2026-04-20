import { createClient } from "@libsql/client";
import fs from "fs";

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

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
  await client.execute("DELETE FROM OrderItem");
  await client.execute("DELETE FROM \"Order\"");
  await client.execute("DELETE FROM Session");
  await client.execute("DELETE FROM Feedback");
  await client.execute("DELETE FROM MenuItem");
  await client.execute("DELETE FROM \"Table\"");
  console.log("Done.");

  console.log("\nSyncing tables...");
  for (const table of tables) {
    await client.execute({
      sql: `INSERT INTO "Table" (id, number, name, password, qrToken, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [
        `table_${table.number}`,
        table.number,
        table.name,
        table.password,
        table.qrToken,
        table.status || "ready",
      ],
    });
  }
  console.log(`Inserted ${tables.length} tables.`);

  console.log("\nSyncing menu items...");
  for (const item of menuItems) {
    await client.execute({
      sql: `INSERT INTO MenuItem (id, name, description, price, category, imageUrl, available, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [
        `menu_${menuItems.indexOf(item) + 1}`,
        item.name,
        item.description || null,
        item.price,
        item.category || "Khác",
        item.imageUrl || null,
        item.available ? 1 : 0,
      ],
    });
  }
  console.log(`Inserted ${menuItems.length} menu items.`);

  console.log("\nDone! Data synced to Turso successfully.");
}

main()
  .catch((e) => {
    console.error("Sync error:", e);
    process.exit(1);
  });
