import type { AdminUserDoc } from "./models/AdminUser";
import type { OrderDoc } from "./models/Order";
import type { ContactDoc } from "./models/Contact";
import type { ProductDoc } from "./models/Product";
import type { AdminOrder, OrderListItem } from "../orders-shared";

/** Shape of the signed-in admin sent to the browser (never includes the password hash). */
export type PublicAdmin = { id: string; email: string; role: string };

export function toPublicAdmin(admin: AdminUserDoc): PublicAdmin {
  return { id: admin.id, email: admin.email, role: admin.role };
}

export function toAdminOrder(order: OrderDoc): AdminOrder {
  return {
    id: order.orderId,
    invoiceNumber: order.invoiceNumber,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    statusHistory: order.statusHistory.map((h) => ({ status: h.status, at: h.at.toISOString(), note: h.note })),
    items: order.items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
    pricing: order.pricing,
    customer: order.customer,
    payment: {
      method: order.payment.method,
      upiId: order.payment.upiId,
      utr: order.payment.utr ?? "",
      status: order.payment.status,
    },
    adminNote: order.adminNote ?? "",
    tags: order.tags ?? [],
    shipment: order.shipment
      ? {
          courier: order.shipment.courier,
          trackingNumber: order.shipment.trackingNumber,
          trackingUrl: order.shipment.trackingUrl || undefined,
          shippedAt: order.shipment.shippedAt.toISOString(),
        }
      : undefined,
    refundRequest: order.refundRequest
      ? {
          status: order.refundRequest.status,
          reason: order.refundRequest.reason,
          preference: order.refundRequest.preference,
          description: order.refundRequest.description,
          requestedAt: order.refundRequest.requestedAt.toISOString(),
          resolutionNote: order.refundRequest.resolutionNote,
          refundReference: order.refundRequest.refundReference,
          resolvedAt: order.refundRequest.resolvedAt ? order.refundRequest.resolvedAt.toISOString() : undefined,
        }
      : undefined,
  };
}

export type AdminMessage = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  status: "new" | "read" | "resolved";
  createdAt: string;
};

export function toAdminMessage(c: ContactDoc): AdminMessage {
  return {
    id: c.id,
    reference: c.reference,
    name: c.name,
    email: c.email,
    phone: c.phone,
    topic: c.topic,
    message: c.message,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  };
}

export type AdminProduct = {
  id: string;
  legacyId?: number;
  name: string;
  category: string;
  image: string;
  description: string;
  price: number;
  originalPrice: number;
  rating: number;
  weight: string;
  stock: number;
  badge: string;
  isSale: boolean;
  isComingSoon: boolean;
  offerEndsAt: string | null;
  order: number;
  reviews: { id: string; author: string; rating: number; comment: string; date: string }[];
};

export function toAdminProduct(p: ProductDoc): AdminProduct {
  return {
    id: p.id,
    legacyId: p.legacyId,
    name: p.name,
    category: p.category,
    image: p.image,
    description: p.description,
    price: p.price,
    originalPrice: p.originalPrice,
    rating: p.rating,
    weight: p.weight,
    stock: p.stock,
    badge: p.badge,
    isSale: p.isSale,
    isComingSoon: p.isComingSoon,
    offerEndsAt: p.offerEndsAt ? p.offerEndsAt.toISOString() : null,
    order: p.order,
    reviews: p.reviews,
  };
}

export function toOrderListItem(order: OrderDoc): OrderListItem {
  return {
    id: order.orderId,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    customer: order.customer,
    pricing: order.pricing,
    payment: { method: order.payment.method, upiId: order.payment.upiId, utr: order.payment.utr ?? "", status: order.payment.status },
    itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    tags: order.tags ?? [],
    hasRefundRequest: !!order.refundRequest && order.refundRequest.status === "requested",
  };
}
