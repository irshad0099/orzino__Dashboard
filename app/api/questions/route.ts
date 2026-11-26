import type { NextRequest } from "next/server";
import { handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { ProductQuestion } from "@/app/lib/server/models/ProductQuestion";
import { Product } from "@/app/lib/server/models/Product";
import type { AdminQuestion } from "@/app/lib/services/questions";

const PAGE_SIZE = 25;

// Shopper questions from product pages. Default view: pending (oldest first, so nobody waits).
export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") || "pending";

  const filter: Record<string, unknown> = {};
  if (status === "pending" || status === "answered" || status === "hidden") filter.status = status;

  const [questions, total, pendingCount] = await Promise.all([
    ProductQuestion.find(filter)
      .sort({ createdAt: status === "pending" ? 1 : -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    ProductQuestion.countDocuments(filter),
    ProductQuestion.countDocuments({ status: "pending" }),
  ]);

  const products = await Product.find({ legacyId: { $in: [...new Set(questions.map((q) => q.productId))] } }).select(
    "legacyId name"
  );
  const nameOf = new Map(products.map((p) => [p.legacyId, p.name]));

  const items: AdminQuestion[] = questions.map((q) => ({
    id: q.id,
    productId: q.productId,
    productName: nameOf.get(q.productId) ?? `Product #${q.productId}`,
    name: q.name,
    email: q.email,
    question: q.question,
    answer: q.answer,
    answeredAt: q.answeredAt ? q.answeredAt.toISOString() : null,
    status: q.status,
    createdAt: q.createdAt.toISOString(),
  }));

  return json({
    questions: items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pendingCount,
  });
});
