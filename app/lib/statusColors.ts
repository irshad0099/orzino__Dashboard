import type { OrderStatus } from "./orders-shared";

/** One color per order status, used everywhere a status is shown (Overview charts, the
 * orders list, order detail) so a status always reads the same color across the dashboard. */
export const STATUS_COLOR: Record<OrderStatus, string> = {
  placed: "#8A8179",
  payment_verified: "#2F6FED",
  packed: "#FFC300",
  shipped: "#B74418",
  delivered: "#1B7A3D",
  cancelled: "#E8115B",
};
