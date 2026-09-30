// Minimal order types shared by API routes and client pages here (mirrors the customer
// site's app/lib/orders-shared.ts, admin-relevant subset only).

export type OrderStatus = "placed" | "payment_verified" | "packed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "verification_pending" | "verified";

export const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "payment_verified",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  payment_verified: "Payment verified",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Forward-only transitions an admin can apply from the current status (cancellation is
// always available except from a terminal state).
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  placed: ["payment_verified", "packed", "cancelled"],
  payment_verified: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

export type AdminOrder = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string; note?: string }[];
  items: OrderItem[];
  pricing: { subtotal: number; gst: number; delivery: number; total: number };
  customer: { name: string; phone: string; email: string; address: string };
  payment: { method: "UPI" | "COD"; upiId: string; utr: string; status: PaymentStatus };
  adminNote: string;
  tags: string[];
};

export const normalizeOrderId = (id: string) => id.trim().toUpperCase();

export type OrderListItem = Pick<
  AdminOrder,
  "id" | "createdAt" | "status" | "customer" | "pricing" | "payment" | "tags"
> & { itemCount: number };
