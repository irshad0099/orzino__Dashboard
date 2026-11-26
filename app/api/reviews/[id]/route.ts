import type { NextRequest } from "next/server";
import { Types } from "mongoose";
import { ApiError, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Review } from "@/app/lib/server/models/Review";
import { reviewStatusSchema } from "@/app/lib/server/schemas";
import { recomputeProductRating } from "@/app/lib/server/reviews";

// Hide / re-publish a review; the product's rating is recomputed right away.
export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { status } = await readJson(req, reviewStatusSchema);
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, "not_found", "Review not found.");
  const review = await Review.findById(id);
  if (!review) throw new ApiError(404, "not_found", "Review not found.");

  if (review.status !== status) {
    review.status = status;
    await review.save();
    await recomputeProductRating(review.productId);
  }
  return json({ ok: true, status: review.status });
});
