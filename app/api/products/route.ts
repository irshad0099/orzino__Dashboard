import type { NextRequest } from "next/server";
import { handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Product } from "@/app/lib/server/models/Product";
import { productSchema } from "@/app/lib/server/schemas";
import { toAdminProduct } from "@/app/lib/server/serializers";

export const GET = handle(async () => {
  await connectDB();
  await requireAdmin();

  const products = await Product.find().sort({ order: 1, createdAt: 1 });
  return json({ products: products.map(toAdminProduct) });
});

export const POST = handle(async (req: NextRequest) => {
  const input = await readJson(req, productSchema);
  await connectDB();
  await requireAdmin();

  const count = await Product.countDocuments();
  // Every product needs a legacyId — it's what the storefront uses for URLs/cart/orders.
  const highest = await Product.findOne().sort({ legacyId: -1 }).select("legacyId");
  const nextLegacyId = (highest?.legacyId ?? 0) + 1;

  const product = await Product.create({
    ...input,
    legacyId: nextLegacyId,
    offerEndsAt: input.offerEndsAt ? new Date(input.offerEndsAt) : null,
    order: input.order ?? count,
  });

  return json({ product: toAdminProduct(product) }, { status: 201 });
});
