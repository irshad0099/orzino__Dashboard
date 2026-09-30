import type { NextRequest } from "next/server";
import { handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Contact } from "@/app/lib/server/models/Contact";
import { toAdminMessage } from "@/app/lib/server/serializers";

const PAGE_SIZE = 25;

export const GET = handle(async (req: NextRequest) => {
  await connectDB();
  await requireAdmin();

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status");

  const filter: Record<string, unknown> = {};
  if (status && ["new", "read", "resolved"].includes(status)) filter.status = status;

  const [messages, total, newCount] = await Promise.all([
    Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Contact.countDocuments(filter),
    Contact.countDocuments({ status: "new" }),
  ]);

  return json({
    messages: messages.map(toAdminMessage),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    newCount,
  });
});
