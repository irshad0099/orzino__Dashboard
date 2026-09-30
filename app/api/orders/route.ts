import type { NextRequest } from "next/server";
import { handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { toOrderListItem } from "@/app/lib/server/serializers";
import { buildOrderFilter } from "@/app/lib/server/orderFilters";

const PAGE_SIZE = 25;

export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const filter = buildOrderFilter(params);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Order.countDocuments(filter),
  ]);

  return json({
    orders: orders.map(toOrderListItem),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});
