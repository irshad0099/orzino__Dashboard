import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";

const ALLOWED_RANGES = [7, 30, 90];

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const daysParam = Number(req.nextUrl.searchParams.get("days"));
  const days = ALLOWED_RANGES.includes(daysParam) ? daysParam : 30;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const trendAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: now }, status: { $ne: "cancelled" } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$pricing.total" },
        orders: { $sum: 1 },
      },
    },
  ]);
  const trendMap = new Map<string, { revenue: number; orders: number }>(
    trendAgg.map((r: { _id: string; revenue: number; orders: number }) => [r._id, { revenue: r.revenue, orders: r.orders }])
  );

  const rows: string[] = [];
  let totalRevenue = 0;
  let totalOrders = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const day = trendMap.get(key) ?? { revenue: 0, orders: 0 };
    totalRevenue += day.revenue;
    totalOrders += day.orders;
    rows.push([key, String(day.orders), String(day.revenue)].map(csvCell).join(","));
  }
  rows.push(["TOTAL", String(totalOrders), String(totalRevenue)].map(csvCell).join(","));

  const csv = ["Date,Orders,Revenue", ...rows].join("\r\n");
  const filename = `orzino-sales-${days}d-${fmtDate(now)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
