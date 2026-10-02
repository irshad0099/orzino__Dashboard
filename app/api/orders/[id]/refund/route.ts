import type { NextRequest } from "next/server";
import { ApiError, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { refundResolutionSchema } from "@/app/lib/server/schemas";
import { toAdminOrder } from "@/app/lib/server/serializers";
import { normalizeOrderId, NEXT_REFUND_STATUSES } from "@/app/lib/orders-shared";

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const input = await readJson(req, refundResolutionSchema);
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const order = await Order.findOne({ orderId: normalizeOrderId(id) });
  if (!order) throw new ApiError(404, "order_not_found", "Order not found.");
  if (!order.refundRequest) throw new ApiError(400, "no_refund_request", "This order has no refund request to resolve.");

  const allowed = NEXT_REFUND_STATUSES[order.refundRequest.status];
  if (!allowed.includes(input.status)) {
    throw new ApiError(
      400,
      "invalid_transition",
      `Can't move a ${order.refundRequest.status} request to ${input.status}.`
    );
  }
  if (input.status === "rejected" && !input.resolutionNote?.trim()) {
    throw new ApiError(400, "note_required", "Add a note explaining why, so the customer knows.");
  }
  if (input.status === "refunded" && !input.refundReference?.trim()) {
    throw new ApiError(400, "reference_required", "Add the UPI/bank refund reference number.");
  }

  order.refundRequest.status = input.status;
  if (input.resolutionNote !== undefined) order.refundRequest.resolutionNote = input.resolutionNote;
  if (input.refundReference !== undefined) order.refundRequest.refundReference = input.refundReference;
  order.refundRequest.resolvedAt = new Date();
  await order.save();

  return json({ order: toAdminOrder(order) });
});
