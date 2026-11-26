import type { NextRequest } from "next/server";
import { ApiError, handle } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { buildLabelsPdf } from "@/app/lib/server/labelPdf";
import { normalizeOrderId } from "@/app/lib/orders-shared";

// GET /api/orders/labels?ids=ORZ-1,ORZ-2 → one 4x6in shipping label per order, in that order.
export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const ids = [
    ...new Set(
      (req.nextUrl.searchParams.get("ids") ?? "")
        .split(",")
        .map(normalizeOrderId)
        .filter(Boolean)
    ),
  ];
  if (ids.length === 0) throw new ApiError(400, "no_orders", "Select at least one order.");
  if (ids.length > 200) throw new ApiError(400, "too_many", "Print at most 200 labels at a time.");

  const found = await Order.find({ orderId: { $in: ids } });
  const byId = new Map(found.map((o) => [o.orderId, o]));
  const orders = ids.map((id) => byId.get(id)).filter((o) => o !== undefined);
  if (orders.length === 0) throw new ApiError(404, "order_not_found", "None of those orders were found.");

  const pdf = await buildLabelsPdf(orders);
  const name = orders.length === 1 ? orders[0].orderId : `${orders.length}-orders`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ORZINO-Labels-${name}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});
