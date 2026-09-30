import type { NextRequest } from "next/server";
import { handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Product } from "@/app/lib/server/models/Product";
import { bulkProductPriceSchema } from "@/app/lib/server/schemas";
import { toAdminProduct } from "@/app/lib/server/serializers";

export const PATCH = handle(async (req: NextRequest) => {
  const { productIds, percent, adjustMrp } = await readJson(req, bulkProductPriceSchema);
  await connectDB();
  await requireAdmin();

  const products = await Product.find({ _id: { $in: productIds } });
  const factor = 1 + percent / 100;

  for (const product of products) {
    product.price = Math.max(1, Math.round(product.price * factor));
    if (adjustMrp) {
      product.originalPrice = Math.max(product.price, Math.round(product.originalPrice * factor));
    }
    await product.save();
  }

  const notFound = productIds.filter((id) => !products.some((p) => p.id === id));

  return json({
    updated: products.length,
    notFound,
    total: productIds.length,
    products: products.map(toAdminProduct),
  });
});
