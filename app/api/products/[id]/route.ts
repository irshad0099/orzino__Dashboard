import type { NextRequest } from "next/server";
import { ApiError, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Product } from "@/app/lib/server/models/Product";
import { productUpdateSchema } from "@/app/lib/server/schemas";
import { toAdminProduct } from "@/app/lib/server/serializers";

export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, "product_not_found", "Product not found.");

  return json({ product: toAdminProduct(product) });
});

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const input = await readJson(req, productUpdateSchema);
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, "product_not_found", "Product not found.");

  Object.assign(product, input);
  if (input.offerEndsAt !== undefined) {
    product.offerEndsAt = input.offerEndsAt ? new Date(input.offerEndsAt) : null;
  }
  await product.save();

  return json({ product: toAdminProduct(product) });
});

export const DELETE = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new ApiError(404, "product_not_found", "Product not found.");

  return json({ ok: true });
});
