import type { NextRequest } from "next/server";
import { ApiError, handle } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { buildInvoicePdf } from "@/app/lib/server/invoicePdf";
import { normalizeOrderId } from "@/app/lib/orders-shared";

// Tax invoice for one order — the same layout the customer downloads from the storefront.
export const GET = handle(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const order = await Order.findOne({ orderId: normalizeOrderId(id) });
  if (!order) throw new ApiError(404, "order_not_found", "Order not found.");

  const pdf = await buildInvoicePdf({
    invoiceNumber: order.invoiceNumber,
    issuedAt: order.createdAt,
    items: order.items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
    subtotal: order.pricing.subtotal,
    gst: order.pricing.gst,
    deliveryCharge: order.pricing.delivery,
    grandTotal: order.pricing.total,
    customer: order.customer,
    payment: {
      method: order.payment.method === "COD" ? "Cash on Delivery" : "UPI",
      reference: order.payment.method === "COD" ? undefined : order.payment.utr,
      status: order.payment.status,
    },
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ORZINO-Invoice-${order.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});
