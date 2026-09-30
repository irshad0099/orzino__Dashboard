import type { NextRequest } from "next/server";
import { handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { extractCity } from "@/app/lib/cityParse";

const ALLOWED_RANGES = [7, 30, 90, 365];

export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const daysParam = Number(req.nextUrl.searchParams.get("days"));
  const days = ALLOWED_RANGES.includes(daysParam) ? daysParam : 90;

  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const orders = await Order.find({ createdAt: { $gte: from }, status: { $ne: "cancelled" } }).select(
    "customer.address pricing.total"
  );

  const byCity = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const city = extractCity(order.customer.address);
    const entry = byCity.get(city) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += order.pricing.total;
    byCity.set(city, entry);
  }

  const cities = [...byCity.entries()]
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.orders - a.orders);

  return json({
    range: { days, from: from.toISOString() },
    totalOrders: orders.length,
    cities,
  });
});
