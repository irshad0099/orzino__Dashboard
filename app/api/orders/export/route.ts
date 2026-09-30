import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Order } from "@/app/lib/server/models/Order";
import { buildOrderFilter } from "@/app/lib/server/orderFilters";
import { ORDER_STATUS_LABEL } from "@/app/lib/orders-shared";

const HEADERS = [
  "Order ID",
  "Date",
  "Status",
  "Customer",
  "Phone",
  "Email",
  "Address",
  "Items",
  "Subtotal",
  "GST",
  "Delivery",
  "Total",
  "Payment method",
  "Payment status",
  "UTR",
];

/** Wraps a value in quotes and escapes inner quotes only when the value needs it (commas, quotes, newlines). */
function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const filter = buildOrderFilter(req.nextUrl.searchParams);
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(5000);

  const rows = orders.map((o) =>
    [
      o.orderId,
      fmtDate(o.createdAt),
      ORDER_STATUS_LABEL[o.status],
      o.customer.name,
      o.customer.phone,
      o.customer.email,
      o.customer.address,
      String(o.items.reduce((s, i) => s + i.quantity, 0)),
      String(o.pricing.subtotal),
      String(o.pricing.gst),
      String(o.pricing.delivery),
      String(o.pricing.total),
      o.payment.method,
      o.payment.status,
      o.payment.utr ?? "",
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [HEADERS.join(","), ...rows].join("\r\n");
  const filename = `orzino-orders-${fmtDate(new Date())}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
