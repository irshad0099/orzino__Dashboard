import { api } from "./api";
import type { AdminOrder, OrderListItem, OrderStatus, PaymentStatus, RefundStatus } from "../orders-shared";

export type OrderListResponse = {
  orders: OrderListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OrderListFilters = {
  page?: number;
  status?: OrderStatus | "";
  paymentStatus?: PaymentStatus | "";
  q?: string;
  hasRefundRequest?: boolean;
};

function filterParams(filters: OrderListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters.q) params.set("q", filters.q);
  if (filters.hasRefundRequest) params.set("hasRefundRequest", "1");
  return params;
}

export function listOrders(filters: OrderListFilters = {}): Promise<OrderListResponse> {
  const qs = filterParams(filters).toString();
  return api<OrderListResponse>(`/api/orders${qs ? `?${qs}` : ""}`);
}

/** URL for the CSV export, honouring the same filters as the list (minus pagination). */
export function exportOrdersUrl(filters: Omit<OrderListFilters, "page"> = {}): string {
  const qs = filterParams(filters).toString();
  return `/api/orders/export${qs ? `?${qs}` : ""}`;
}

/** Shipping labels (4x6in, one page per order) for one or more orders. */
export const labelsPdfUrl = (orderIds: string[]) =>
  `/api/orders/labels?ids=${encodeURIComponent(orderIds.join(","))}`;

/** Tax invoice PDF for one order. */
export const invoicePdfUrl = (orderId: string) => `/api/orders/${encodeURIComponent(orderId)}/invoice`;

export const getOrder = (id: string) => api<{ order: AdminOrder }>(`/api/orders/${id}`).then((r) => r.order);

export type ShipmentInput = { courier: string; trackingNumber: string; trackingUrl?: string };

export const updateOrderStatus = (id: string, status: OrderStatus, note?: string, shipment?: ShipmentInput) =>
  api<{ order: AdminOrder }>(`/api/orders/${id}/status`, { method: "PATCH", body: { status, note, shipment } }).then(
    (r) => r.order
  );

export const updateOrderPayment = (id: string, status: PaymentStatus) =>
  api<{ order: AdminOrder }>(`/api/orders/${id}/payment`, { method: "PATCH", body: { status } }).then((r) => r.order);

export const updateOrderNote = (id: string, input: { adminNote?: string; tags?: string[] }) =>
  api<{ order: AdminOrder }>(`/api/orders/${id}/note`, { method: "PATCH", body: input }).then((r) => r.order);

export type BulkStatusResult = { updated: number; skipped: string[]; notFound: string[]; total: number };

export const bulkUpdateStatus = (orderIds: string[], status: OrderStatus) =>
  api<BulkStatusResult>("/api/orders/bulk", { method: "PATCH", body: { orderIds, status } });

export const resolveRefundRequest = (
  id: string,
  input: { status: RefundStatus; resolutionNote?: string; refundReference?: string }
) => api<{ order: AdminOrder }>(`/api/orders/${id}/refund`, { method: "PATCH", body: input }).then((r) => r.order);
