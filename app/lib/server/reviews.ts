import "server-only";
import { createHmac } from "node:crypto";
import { Product } from "./models/Product";
import { Review } from "./models/Review";

/**
 * "Rate your order" link token — MUST match verifyReviewToken() in the customer site
 * (orzino: app/lib/server/reviews.ts). Both apps need the same REVIEW_LINK_SECRET (32+ chars).
 * Returns null when the secret isn't configured (the email then links to the product pages).
 */
export function createReviewToken(orderId: string, now = Date.now()): string | null {
  const secret = process.env.REVIEW_LINK_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  const exp = Math.floor(now / 1000) + 60 * 24 * 60 * 60; // 60 days
  const sig = createHmac("sha256", secret).update(`review:${orderId}:${exp}`).digest("base64url");
  return `${orderId}.${exp}.${sig}`;
}

/** Same as the storefront's: product rating/reviewCount from its PUBLISHED reviews. */
export async function recomputeProductRating(productId: number): Promise<void> {
  const [agg] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { productId, status: "published" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { legacyId: productId },
    { $set: { rating: agg ? Math.round(agg.avg * 10) / 10 : 0, reviewCount: agg?.count ?? 0 } }
  );
}
