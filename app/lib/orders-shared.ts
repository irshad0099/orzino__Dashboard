// Minimal order types shared by API routes and client pages here (mirrors the customer
// site's app/lib/orders-shared.ts, admin-relevant subset only).

export type OrderStatus = "placed" | "payment_verified" | "packed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "verification_pending" | "verified";

export type RefundReason =
  | "damaged"
  | "wrong_item"
  | "missing_item"
  | "expired"
  | "duplicate_charge"
  | "undelivered"
  | "other";
export type RefundPreference = "refund" | "replacement" | "store_credit";
export type RefundStatus = "requested" | "approved" | "rejected" | "refunded";

export type RefundRequest = {
  status: RefundStatus;
  reason: RefundReason;
  preference: RefundPreference;
  description: string;
  requestedAt: string;
  resolutionNote?: string;
  refundReference?: string;
  resolvedAt?: string;
};

export const REFUND_REASON_LABEL: Record<RefundReason, string> = {
  damaged: "Arrived damaged",
  wrong_item: "Wrong item received",
  missing_item: "Item missing from order",
  expired: "Expired / spoiled",
  duplicate_charge: "Charged twice / wrong amount",
  undelivered: "Never received the order",
  other: "Other",
};

export const REFUND_PREFERENCE_LABEL: Record<RefundPreference, string> = {
  refund: "Refund",
  replacement: "Replacement",
  store_credit: "Store credit",
};

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  refunded: "Refunded",
};

// Forward-only transitions an admin can apply to a refund request.
export const NEXT_REFUND_STATUSES: Record<RefundStatus, RefundStatus[]> = {
  requested: ["approved", "rejected", "refunded"],
  approved: ["refunded", "rejected"],
  rejected: [],
  refunded: [],
};

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
  shipment?: { courier: string; trackingNumber: string; trackingUrl?: string; shippedAt: string };
  refundRequest?: RefundRequest;
};

export const normalizeOrderId = (id: string) => id.trim().toUpperCase();

export type OrderListItem = Pick<
  AdminOrder,
  "id" | "createdAt" | "status" | "customer" | "pricing" | "payment" | "tags"
> & { itemCount: number; hasRefundRequest: boolean };
