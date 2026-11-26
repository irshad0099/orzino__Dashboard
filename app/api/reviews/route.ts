import type { NextRequest } from "next/server";
import { handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Review } from "@/app/lib/server/models/Review";
import { Product } from "@/app/lib/server/models/Product";
import type { AdminReview } from "@/app/lib/services/reviews";

const PAGE_SIZE = 25;

// Customer reviews (verified buyers), newest first. ?status=published|hidden, ?rating=1..5
export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status");
  const rating = Number(params.get("rating"));

  const filter: Record<string, unknown> = {};
  if (status === "published" || status === "hidden") filter.status = status;
  if (rating >= 1 && rating <= 5) filter.rating = rating;

  const [reviews, total, publishedCount, hiddenCount] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Review.countDocuments(filter),
    Review.countDocuments({ status: "published" }),
    Review.countDocuments({ status: "hidden" }),
  ]);

  const products = await Product.find({ legacyId: { $in: [...new Set(reviews.map((r) => r.productId))] } }).select(
    "legacyId name image"
  );
  const byId = new Map(products.map((p) => [p.legacyId, p]));

  const items: AdminReview[] = reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: byId.get(r.productId)?.name ?? `Product #${r.productId}`,
    productImage: byId.get(r.productId)?.image ?? "",
    orderId: r.orderId,
    authorName: r.authorName,
    rating: r.rating,
    comment: r.comment,
    media: r.media.map((m) => ({ type: m.type, url: m.url })),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return json({
    reviews: items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    publishedCount,
    hiddenCount,
  });
});
