import { after, type NextRequest } from "next/server";
import { ApiError, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { orderStatusSchema } from "@/app/lib/server/schemas";
import { toAdminOrder } from "@/app/lib/server/serializers";
import { sendShippedEmail } from "@/app/lib/server/orderEmails";
import { normalizeOrderId, NEXT_STATUSES } from "@/app/lib/orders-shared";

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { status, note, shipment } = await readJson(req, orderStatusSchema);
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

  const nowShipped = status === "shipped" && order.status !== "shipped";

  if (status !== order.status) {
    order.status = status;
    order.statusHistory.push({ status, at: new Date(), note });
  }
  if (status === "shipped" && shipment) {
    // Also lets the admin correct a typo in the tracking number after shipping.
    order.shipment = {
      courier: shipment.courier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl || undefined,
      shippedAt: order.shipment?.shippedAt ?? new Date(),
    };
  }
  if (order.isModified()) await order.save();

  // Dispatch email with the tracking details — after the response, never blocks the admin.
  if (nowShipped) {
    const snapshot = order.toObject();
    after(() => sendShippedEmail(snapshot));
  }

  return json({ order: toAdminOrder(order) });
});
