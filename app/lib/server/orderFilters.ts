import "server-only";
import type { NextRequest } from "next/server";
import { ORDER_STATUSES } from "@/app/lib/orders-shared";

/** Builds the same Mongo filter from query params for both the paginated list and the export. */
export function buildOrderFilter(params: NextRequest["nextUrl"]["searchParams"]): Record<string, unknown> {
  const status = params.get("status");
  const paymentStatus = params.get("paymentStatus");
  const q = params.get("q")?.trim();
  const from = params.get("from");
  const to = params.get("to");

  const filter: Record<string, unknown> = {};
  if (status && (ORDER_STATUSES as string[]).includes(status)) filter.status = status;
  if (paymentStatus === "verified" || paymentStatus === "verification_pending") {
    filter["payment.status"] = paymentStatus;
  }
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.$gte = new Date(from);
    if (to) createdAt.$lte = new Date(to);
    filter.createdAt = createdAt;
  }
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ orderId: rx }, { "customer.name": rx }, { "customer.phone": rx }, { "payment.utr": rx }];
  }
  return filter;
}
