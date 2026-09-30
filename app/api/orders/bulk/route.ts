import type { NextRequest } from "next/server";
import { handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { bulkOrderStatusSchema } from "@/app/lib/server/schemas";
import { normalizeOrderId, NEXT_STATUSES } from "@/app/lib/orders-shared";

export const PATCH = handle(async (req: NextRequest) => {
  const { orderIds, status } = await readJson(req, bulkOrderStatusSchema);
  await connectDB();
  await requireAdmin();

  const ids = orderIds.map(normalizeOrderId);
  const orders = await Order.find({ orderId: { $in: ids } });

  let updated = 0;
  const skipped: string[] = [];
  const now = new Date();

  for (const order of orders) {
    if (order.status === status) continue; // already there, nothing to do
    const allowed = NEXT_STATUSES[order.status];
    if (!allowed.includes(status)) {
      skipped.push(order.orderId);
      continue;
    }
    order.status = status;
    order.statusHistory.push({ status, at: now, note: "Bulk update" });
    await order.save();
    updated++;
  }

  const notFound = ids.filter((id) => !orders.some((o) => o.orderId === id));

  return json({ updated, skipped, notFound, total: ids.length });
});
