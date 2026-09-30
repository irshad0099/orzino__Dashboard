// Verifies the Atlas connection and creates/updates all indexes.
//   npm run db:check
// Reads MONGODB_URI / MONGODB_DB / AUTH_SECRET from .env.local. Never prints the connection string.
// This should be the SAME MONGODB_URI/MONGODB_DB as the customer site (orzino) — the dashboard
// reads and writes the same database, just from a separate app.

import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../app/lib/server/db";
import { getEnv } from "../app/lib/server/env";
import { AdminUser } from "../app/lib/server/models/AdminUser";
import { Product } from "../app/lib/server/models/Product";
import { RateLimit } from "../app/lib/server/models/RateLimit";

function hostOf(uri: string): string {
  const match = /@([^/?]+)/.exec(uri) ?? /^mongodb(?:\+srv)?:\/\/([^/?]+)/.exec(uri);
  return match ? match[1] : "(unknown host)";
}

async function main() {
  const env = getEnv();
  console.log(`Connecting to ${hostOf(env.MONGODB_URI)} (database "${env.MONGODB_DB}") ...`);

  await connectDB();
  await mongoose.connection.db!.admin().ping();
  console.log("✔ Connected and ping succeeded");

  for (const model of [AdminUser, Product, RateLimit]) {
    await model.syncIndexes();
    const indexes = await model.collection.indexes();
    console.log(`✔ ${model.modelName}: ${indexes.length} indexes (${indexes.map((i) => i.name).join(", ")})`);
  }

  const [admins, products] = await Promise.all([AdminUser.estimatedDocumentCount(), Product.estimatedDocumentCount()]);
  console.log(`✔ Collections ready — admins: ${admins}, products: ${products}`);
  if (admins === 0) console.log('  (No admin account yet — run: npm run create-admin -- --email you@orzino.com --password "...")');
  console.log("\nAll good. You can run `npm run dev`.");
}

main()
  .catch((error: Error) => {
    console.error(`\n✖ ${error.name}: ${error.message}`);
    const msg = error.message.toLowerCase();
    if (msg.includes("auth")) {
      console.error("  → Check the DB username/password (URL-encode special characters in the password).");
    } else if (msg.includes("server selection") || msg.includes("timed out") || msg.includes("enotfound")) {
      console.error("  → In Atlas → Network Access, allow your IP (or 0.0.0.0/0 for Vercel). Also check the cluster host name.");
    }
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
