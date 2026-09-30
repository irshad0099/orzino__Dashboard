import type { NextRequest } from "next/server";
import { handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { Product } from "@/app/lib/server/models/Product";
import { toOrderListItem } from "@/app/lib/server/serializers";
import { ORDER_STATUSES } from "@/app/lib/orders-shared";

const ALLOWED_RANGES = [7, 30, 90];
const LOW_STOCK_THRESHOLD = 10;

export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const daysParam = Number(req.nextUrl.searchParams.get("days"));
  const days = ALLOWED_RANGES.includes(daysParam) ? daysParam : 30;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const rangeFilter = { createdAt: { $gte: from, $lte: now } };
  const nonCancelledInRange = { ...rangeFilter, status: { $ne: "cancelled" } };

  const [summaryAgg, pendingPayments, trendAgg, statusAgg, topProductsAgg, recentOrders, customerAgg, lowStockDocs] =
    await Promise.all([
      Order.aggregate([
        { $match: nonCancelledInRange },
        { $group: { _id: null, revenue: { $sum: "$pricing.total" }, orders: { $sum: 1 } } },
      ]),
      Order.countDocuments({ "payment.status": "verification_pending" }),
      Order.aggregate([
        { $match: nonCancelledInRange },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$pricing.total" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: nonCancelledInRange },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
        { $sort: { units: -1 } },
        { $limit: 5 },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(5),
      // Customer insights: group by phone (the stable identity guests and accounts share).
      Order.aggregate([
        { $match: nonCancelledInRange },
        {
          $group: {
            _id: "$customer.phone",
            name: { $last: "$customer.name" },
            orders: { $sum: 1 },
            total: { $sum: "$pricing.total" },
          },
        },
      ]),
      Product.find({ stock: { $lte: LOW_STOCK_THRESHOLD }, isComingSoon: false })
        .sort({ stock: 1 })
        .limit(10)
        .select("name stock weight"),
    ]);

  const revenue = summaryAgg[0]?.revenue ?? 0;
  const ordersCount = summaryAgg[0]?.orders ?? 0;
  const aov = ordersCount ? Math.round(revenue / ordersCount) : 0;

  const trendMap = new Map<string, { revenue: number; orders: number }>(
    trendAgg.map((r: { _id: string; revenue: number; orders: number }) => [r._id, { revenue: r.revenue, orders: r.orders }])
  );
  const revenueTrend: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const day = trendMap.get(key);
    revenueTrend.push({ date: key, revenue: day?.revenue ?? 0, orders: day?.orders ?? 0 });
  }

  const statusCounts = new Map<string, number>(statusAgg.map((r: { _id: string; count: number }) => [r._id, r.count]));
  const statusBreakdown = ORDER_STATUSES.map((status) => ({ status, count: statusCounts.get(status) ?? 0 }));

  const topProducts = topProductsAgg.map((r: { _id: string; units: number; revenue: number }) => ({
    name: r._id,
    units: r.units,
    revenue: r.revenue,
  }));

  const customers = customerAgg as { _id: string; name: string; orders: number; total: number }[];
  const repeatCustomers = customers.filter((c) => c.orders > 1).length;
  const topSpenders = [...customers]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((c) => ({ phone: c._id, name: c.name, orders: c.orders, total: c.total }));

  const lowStockProducts = lowStockDocs.map((p) => ({ id: p.id, name: p.name, stock: p.stock, weight: p.weight }));

  return json({
    range: { days, from: from.toISOString(), to: now.toISOString() },
    summary: { revenue, orders: ordersCount, aov, pendingPayments },
    revenueTrend,
    statusBreakdown,
    topProducts,
    recentOrders: recentOrders.map(toOrderListItem),
    customerInsights: {
      totalCustomers: customers.length,
      repeatCustomers,
      repeatRate: customers.length ? Math.round((repeatCustomers / customers.length) * 100) : 0,
      topSpenders,
    },
    lowStockProducts,
  });
});
