import type { NextRequest } from "next/server";
import { ApiError, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { orderStatusSchema } from "@/app/lib/server/schemas";
import { toAdminOrder } from "@/app/lib/server/serializers";
import { normalizeOrderId, NEXT_STATUSES } from "@/app/lib/orders-shared";

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { status, note } = await readJson(req, orderStatusSchema);
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const order = await Order.findOne({ orderId: normalizeOrderId(id) });
  if (!order) throw new ApiError(404, "order_not_found", "Order not found.");

  const allowed = NEXT_STATUSES[order.status];
  if (status !== order.status && !allowed.includes(status)) {
    throw new ApiError(
      400,
      "invalid_transition",
      `Can't move an order from "${order.status}" to "${status}" directly.`
    );
  }

  if (status !== order.status) {
    order.status = status;
    order.statusHistory.push({ status, at: new Date(), note });
    await order.save();
  }

  return json({ order: toAdminOrder(order) });
});
