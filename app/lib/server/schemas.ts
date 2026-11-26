import { z } from "zod";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).refine(isValidEmail, "Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const shipmentSchema = z.object({
  courier: z.string().trim().min(2, "Enter the courier name.").max(60),
  trackingNumber: z.string().trim().min(3, "Enter the tracking / AWB number.").max(60),
  trackingUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Tracking link must start with http:// or https://")
    .optional()
    .default(""),
});

export const orderStatusSchema = z
  .object({
    status: z.enum(["placed", "payment_verified", "packed", "shipped", "delivered", "cancelled"]),
    note: z.string().trim().max(200).optional(),
    // Required when marking an order "shipped" — it is what the customer's tracking email shows.
    shipment: shipmentSchema.optional(),
  })
  .refine((v) => v.status !== "shipped" || v.shipment, {
    message: "Add the courier and tracking number to mark this order shipped.",
    path: ["shipment"],
  });

export const orderPaymentSchema = z.object({
  status: z.enum(["verified", "verification_pending"]),
});

export const messageStatusSchema = z.object({
  status: z.enum(["new", "read", "resolved"]),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1).max(60),
  image: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(1000),
  price: z.number().min(0),
  originalPrice: z.number().min(0),
  weight: z.string().trim().min(1).max(20),
  stock: z.number().int().min(0),
  badge: z.string().trim().max(30).optional().default(""),
  isSale: z.boolean().optional().default(false),
  isComingSoon: z.boolean().optional().default(false),
  offerEndsAt: z.string().trim().optional().nullable(),
  order: z.number().int().optional().default(0),
});

export const productUpdateSchema = productSchema.partial();

export const siteSettingsSchema = z.object({
  gstRate: z.number().min(0).max(1),
  deliveryCharge: z.number().min(0),
  freeDeliveryMinPacks: z.number().int().min(1),
  maxPerProduct: z.number().int().min(1),
  etaMinDays: z.number().int().min(0),
  etaMaxDays: z.number().int().min(0),
});

export const adminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

export const orderNoteSchema = z.object({
  adminNote: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(10).optional(),
});

export const refundResolutionSchema = z.object({
  status: z.enum(["approved", "rejected", "refunded"]),
  resolutionNote: z.string().trim().max(500).optional(),
  refundReference: z.string().trim().max(100).optional(),
});

export const bulkOrderStatusSchema = z.object({
  orderIds: z.array(z.string().trim().min(1)).min(1).max(200),
  status: z.enum(["placed", "payment_verified", "packed", "shipped", "delivered", "cancelled"]),
});

export const bulkProductPriceSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1).max(200),
  // e.g. -10 = 10% cheaper, 15 = 15% more expensive
  percent: z.number().min(-90).max(500),
  // when true, originalPrice (MRP) is adjusted too, keeping the same discount %
  adjustMrp: z.boolean().optional().default(false),
});

export const reviewStatusSchema = z.object({
  status: z.enum(["published", "hidden"]),
});

export const questionUpdateSchema = z
  .object({
    answer: z.string().trim().max(1000).optional(),
    status: z.enum(["pending", "answered", "hidden"]).optional(),
  })
  .refine((v) => v.answer !== undefined || v.status !== undefined, { message: "Nothing to update." })
  .refine((v) => v.status !== "answered" || (v.answer ?? "").length >= 2, {
    message: "Write an answer first.",
    path: ["answer"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
