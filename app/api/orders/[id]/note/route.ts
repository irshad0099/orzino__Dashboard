import type { NextRequest } from "next/server";
import { ApiError, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { orderNoteSchema } from "@/app/lib/server/schemas";
import { toAdminOrder } from "@/app/lib/server/serializers";
import { normalizeOrderId } from "@/app/lib/orders-shared";

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const input = await readJson(req, orderNoteSchema);
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const order = await Order.findOne({ orderId: normalizeOrderId(id) });
  if (!order) throw new ApiError(404, "order_not_found", "Order not found.");

  if (input.adminNote !== undefined) order.adminNote = input.adminNote;
  if (input.tags !== undefined) order.tags = input.tags;
  await order.save();

  return json({ order: toAdminOrder(order) });
});
