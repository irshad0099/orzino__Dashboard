import { after, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { ApiError, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { ProductQuestion } from "@/app/lib/server/models/ProductQuestion";
import { Product } from "@/app/lib/server/models/Product";
import { questionUpdateSchema } from "@/app/lib/server/schemas";
import { sendQuestionAnsweredEmail } from "@/app/lib/server/orderEmails";

// Answer (publishes it on the product page), edit an answer, hide, or move back to pending.
// The first time a question is answered, the shopper is emailed (if they left an email).
export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const input = await readJson(req, questionUpdateSchema);
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, "not_found", "Question not found.");
  const q = await ProductQuestion.findById(id);
  if (!q) throw new ApiError(404, "not_found", "Question not found.");

  const firstAnswer = !q.answeredAt;
  if (input.answer !== undefined) q.answer = input.answer;
  if (input.status) q.status = input.status;
  else if (input.answer) q.status = "answered";
  if (q.status === "answered") {
    if (q.answer.trim().length < 2) throw new ApiError(400, "answer_required", "Write an answer first.");
    q.answeredAt ??= new Date();
  }
  await q.save();

  if (q.status === "answered" && firstAnswer && q.email) {
    const product = await Product.findOne({ legacyId: q.productId }).select("name");
    const snapshot = { productId: q.productId, productName: product?.name ?? "your product", name: q.name, email: q.email, question: q.question, answer: q.answer };
    after(() => sendQuestionAnsweredEmail(snapshot));
  }

  return json({ ok: true, status: q.status, answer: q.answer, answeredAt: q.answeredAt?.toISOString() ?? null });
});
