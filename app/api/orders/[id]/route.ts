import { ApiError, handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { toAdminOrder } from "@/app/lib/server/serializers";
import { normalizeOrderId } from "@/app/lib/orders-shared";

export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const order = await Order.findOne({ orderId: normalizeOrderId(id) });
  if (!order) throw new ApiError(404, "order_not_found", "Order not found.");

  return json({ order: toAdminOrder(order) });
});
