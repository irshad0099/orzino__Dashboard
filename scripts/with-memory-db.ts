// Runs any command against a throw-away in-memory MongoDB (no Atlas needed):
//   npm run dev:memory      → next dev   with an in-memory DB
//   npm run start:memory    → next start with an in-memory DB (after `npm run build`)
// A test admin account is seeded automatically (there's no public sign-up route).
// Data disappears when the process exits. Great for trying the dashboard or testing.

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const TEST_ADMIN_EMAIL = "admin@orzino.test";
const TEST_ADMIN_PASSWORD = "TestAdmin#123";

async function seedTestAdmin(uri: string, dbName: string) {
  const bcrypt = (await import("bcryptjs")).default;
  const conn = await mongoose.createConnection(uri, { dbName }).asPromise();
  const AdminUser = conn.model(
    "AdminUser",
    new mongoose.Schema(
      { email: String, passwordHash: String, role: String, tokenVersion: { type: Number, default: 0 } },
      { timestamps: true }
    )
  );
  await AdminUser.create({
    email: TEST_ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(TEST_ADMIN_PASSWORD, 12),
    role: "owner",
  });
  await conn.close();
}

const PRODUCTS = [
  { productId: 1, weight: "30g", name: "Pineapple Slices (30g)", price: 149, image: "/images/newPineapple.jpeg" },
  { productId: 2, weight: "30g", name: "Mango Slices (30g)", price: 149, image: "/images/newMango.jpeg" },
  { productId: 3, weight: "30g", name: "Banana Chips (30g)", price: 149, image: "/images/banana.jpeg" },
];
const NAMES = ["Riya Verma", "Karan Mehta", "Aarav Shah", "Sneha Kapoor", "Vikram Rao", "Pooja Iyer"];
const STATUSES = ["placed", "payment_verified", "packed", "shipped", "delivered", "delivered", "cancelled"] as const;
const ADDRESSES = [
  "Flat 12, Sector 62, Noida 201301",
  "23 MG Road, Bengaluru 560001",
  "B-4 Andheri West, Mumbai 400058",
  "House 9, Koramangala, Bengaluru 560034",
  "12 Civil Lines, Jaipur 302006",
  "Plot 5, Banjara Hills, Hyderabad 500034",
];

function seedOrder(Order: mongoose.Model<Record<string, unknown>>, i: number) {
  const daysAgo = Math.floor(Math.random() * 30);
  const createdAt = new Date(Date.now() - daysAgo * 86400000);
  const product = PRODUCTS[i % PRODUCTS.length];
  const qty = 1 + (i % 3);
  const subtotal = product.price * qty;
  const gst = Math.round(subtotal * 0.05);
  const delivery = qty === 1 ? 30 : 0;
  const total = subtotal + gst + delivery;
  const status = STATUSES[i % STATUSES.length];
  const orderId = `ORZ-TEST${String(i).padStart(3, "0")}`;
  const doc = {
    orderId,
    invoiceNumber: orderId.replace("ORZ", "INV"),
    userId: null,
    status,
    statusHistory: [{ status: "placed", at: createdAt }, ...(status !== "placed" ? [{ status, at: createdAt }] : [])],
    items: [{ id: `${product.productId}-${product.weight}`, productId: product.productId, weight: product.weight, name: product.name, price: product.price, quantity: qty, image: product.image }],
    pricing: { subtotal, gst, delivery, total },
    customer: { name: NAMES[i % NAMES.length], phone: `9${String(100000000 + i).slice(0, 9)}`, email: "", address: ADDRESSES[i % ADDRESSES.length] },
    payment:
      i % 5 === 0
        ? { method: "COD", upiId: "", status: i % 10 === 0 ? "verified" : "verification_pending" }
        : { method: "UPI", upiId: "test@upi", utr: `TESTUTR${String(i).padStart(6, "0")}`, status: i % 4 === 0 ? "verification_pending" : "verified" },
    expectedDelivery: { from: createdAt, to: new Date(createdAt.getTime() + 5 * 86400000) },
    createdAt,
    updatedAt: createdAt,
  };
  // Schema is `strict:false` (loose on purpose, throwaway seed data) — mongoose's typed
  // overloads don't model that, so a plain object here needs a cast.
  return Order.create(doc as unknown as Record<string, unknown>);
}

async function seedTestOrders(uri: string, dbName: string) {
  const conn = await mongoose.createConnection(uri, { dbName }).asPromise();
  const Order = conn.model<Record<string, unknown>>(
    "Order",
    new mongoose.Schema({}, { strict: false, timestamps: true, collection: "orders" })
  );
  // Sequential, not Promise.all: keeps insert order predictable and avoids hammering the
  // freshly-started in-memory mongod with 24 concurrent connections-in-flight.
  for (let i = 0; i < 24; i++) await seedOrder(Order, i);
  await conn.close();
}

const SAMPLE_PRODUCTS = [
  { legacyId: 1, name: "Pineapple Slices", category: "Fruit Cubes", image: "/images/newPineapple.jpeg", description: "Tropical, crunchy, no added sugar.", price: 149, originalPrice: 249, weight: "30g", stock: 8, badge: "Best Seller", isSale: true, isComingSoon: false, order: 0 },
  { legacyId: 2, name: "Mango Slices", category: "Crispy Slices", image: "/images/newMango.jpeg", description: "Sweet, tangy, crispy Alphonso mango.", price: 149, originalPrice: 249, weight: "30g", stock: 8, badge: "Popular", isSale: true, isComingSoon: false, order: 1 },
  { legacyId: 3, name: "Banana Chips", category: "Jars", image: "/images/banana.jpeg", description: "Crisp, naturally sweet banana chips.", price: 149, originalPrice: 249, weight: "30g", stock: 8, badge: "Trending", isSale: true, isComingSoon: true, order: 2 },
];

const SAMPLE_MESSAGES = [
  { reference: "CNT-TEST001", name: "Ritu Sharma", email: "ritu@example.com", phone: "9812345601", topic: "Order query", message: "My order hasn't shipped in 3 days, please check.", status: "new" },
  { reference: "CNT-TEST002", name: "Amit Joshi", email: "", phone: "9812345602", topic: "Bulk / wholesale", message: "Interested in a bulk order of 50 packs for a corporate gift.", status: "new" },
  { reference: "CNT-TEST003", name: "Neha Gupta", email: "neha@example.com", phone: "9812345603", topic: "Product question", message: "Is the mango pack suitable for kids under 5?", status: "read" },
  { reference: "CNT-TEST004", name: "Suresh Nair", email: "", phone: "9812345604", topic: "Delivery & returns", message: "Package arrived damaged, requesting a replacement.", status: "resolved" },
];

async function seedTestProductsAndMessages(uri: string, dbName: string) {
  const conn = await mongoose.createConnection(uri, { dbName }).asPromise();
  const Product = conn.model<Record<string, unknown>>(
    "Product",
    new mongoose.Schema({}, { strict: false, timestamps: true, collection: "products" })
  );
  const Contact = conn.model<Record<string, unknown>>(
    "Contact",
    new mongoose.Schema({}, { strict: false, timestamps: true, collection: "contacts" })
  );
  for (const p of SAMPLE_PRODUCTS) await Product.create(p as unknown as Record<string, unknown>);
  for (const m of SAMPLE_MESSAGES) await Contact.create(m as unknown as Record<string, unknown>);
  await conn.close();
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    console.error("Usage: tsx scripts/with-memory-db.ts <command> [args...]");
    process.exit(1);
  }

  console.log("Starting in-memory MongoDB (first run downloads a mongod binary) ...");
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const dbName = process.env.MONGODB_DB || "orzino_admin_memory";

  await seedTestAdmin(uri, dbName);
  await seedTestOrders(uri, dbName);
  await seedTestProductsAndMessages(uri, dbName);
  console.log(`In-memory MongoDB ready (24 orders, 3 products, 4 messages). Test admin login: ${TEST_ADMIN_EMAIL} / ${TEST_ADMIN_PASSWORD}\n`);

  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      MONGODB_URI: uri,
      MONGODB_DB: dbName,
      AUTH_SECRET: process.env.AUTH_SECRET || randomBytes(32).toString("hex"),
    },
  });

  const stop = async (code: number | null) => {
    await mongod.stop();
    process.exit(code ?? 0);
  };
  child.on("exit", (code) => void stop(code));
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => child.kill(signal));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
