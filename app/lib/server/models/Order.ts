import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";

// Mirrors app/lib/server/models/Order.ts in the customer site (orzino) exactly — both apps
// read and write the SAME "orders" collection in the same Atlas database. Keep these two
// schemas in sync if either one changes.
//
// IMPORTANT: never call Order.syncIndexes() from this app. syncIndexes() DROPS any index on
// the collection that isn't in ITS OWN schema — since orzino owns this collection, only its
// db:check may sync its indexes. Reading/writing documents (and Mongoose's default, additive
// auto-index-creation on first use) is fine; explicit syncIndexes() here is not.

export const ORDER_STATUSES = [
  "placed",
  "payment_verified",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const REFUND_REASONS = [
  "damaged",
  "wrong_item",
  "missing_item",
  "expired",
  "duplicate_charge",
  "undelivered",
  "other",
] as const;
export const REFUND_PREFERENCES = ["refund", "replacement", "store_credit"] as const;
export const REFUND_STATUSES = ["requested", "approved", "rejected", "refunded"] as const;

export interface IOrder {
  orderId: string;
  invoiceNumber: string;
  userId: Types.ObjectId | null;
  status: (typeof ORDER_STATUSES)[number];
  statusHistory: { status: (typeof ORDER_STATUSES)[number]; at: Date; note?: string }[];
  items: { id: string; productId: number; weight: string; name: string; price: number; quantity: number; image: string }[];
  pricing: { subtotal: number; gst: number; delivery: number; total: number };
  customer: { name: string; phone: string; email: string; address: string };
  payment: {
    method: "UPI" | "COD";
    upiId: string; // empty for COD
    utr?: string; // UPI only — absent entirely for COD orders
    status: "verification_pending" | "verified";
  };
  expectedDelivery: { from: Date; to: Date };
  clientRequestId?: string;
  adminNote: string; // internal, admin-only (e.g. "customer called, confirmed address")
  tags: string[]; // internal, admin-only free-form labels
  // Written here when the order is marked "shipped"; the customer sees it on their order page.
  shipment?: { courier: string; trackingNumber: string; trackingUrl?: string; shippedAt: Date };
  refundRequest?: {
    status: (typeof REFUND_STATUSES)[number];
    reason: (typeof REFUND_REASONS)[number];
    preference: (typeof REFUND_PREFERENCES)[number];
    description: string;
    requestedAt: Date;
    resolutionNote?: string; // customer-visible — set here when resolving
    refundReference?: string; // customer-visible — UPI/bank reference once refunded
    resolvedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDoc = HydratedDocument<IOrder>;

const itemSchema = new Schema(
  {
    id: { type: String, required: true },
    productId: { type: Number, required: true },
    weight: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 8 },
    image: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ORDER_STATUSES, default: "placed" },
    statusHistory: {
      type: [
        new Schema(
          {
            status: { type: String, enum: ORDER_STATUSES, required: true },
            at: { type: Date, required: true },
            note: { type: String },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    items: {
      type: [itemSchema],
      validate: { validator: (list: unknown[]) => list.length >= 1, message: "An order needs at least one item." },
    },
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      gst: { type: Number, required: true, min: 0 },
      delivery: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
    },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      phone: { type: String, required: true },
      email: { type: String, default: "", maxlength: 254 },
      address: { type: String, required: true, trim: true, maxlength: 300 },
    },
    payment: {
      method: { type: String, enum: ["UPI", "COD"], default: "UPI" },
      upiId: { type: String, default: "" },
      utr: { type: String },
      status: { type: String, enum: ["verification_pending", "verified"], default: "verification_pending" },
    },
    expectedDelivery: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    clientRequestId: { type: String },
    adminNote: { type: String, default: "", maxlength: 500 },
    tags: { type: [String], default: [] },
    shipment: {
      type: new Schema(
        {
          courier: { type: String, required: true, trim: true, maxlength: 60 },
          trackingNumber: { type: String, required: true, trim: true, maxlength: 60 },
          trackingUrl: { type: String, trim: true, maxlength: 300 },
          shippedAt: { type: Date, required: true },
        },
        { _id: false }
      ),
      required: false,
    },
    refundRequest: {
      type: new Schema(
        {
          status: { type: String, enum: REFUND_STATUSES, required: true, default: "requested" },
          reason: { type: String, enum: REFUND_REASONS, required: true },
          preference: { type: String, enum: REFUND_PREFERENCES, required: true },
          description: { type: String, required: true, trim: true, maxlength: 1000 },
          requestedAt: { type: Date, required: true },
          resolutionNote: { type: String, trim: true, maxlength: 500 },
          refundReference: { type: String, trim: true, maxlength: 100 },
          resolvedAt: { type: Date },
        },
        { _id: false }
      ),
      required: false,
    },
  },
  { timestamps: true }
);

orderSchema.index({ "payment.utr": 1 }, { unique: true, partialFilterExpression: { "payment.utr": { $type: "string" } } });
orderSchema.index(
  { clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $type: "string" } } }
);
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order: Model<IOrder> = (models.Order as Model<IOrder>) || model<IOrder>("Order", orderSchema);
