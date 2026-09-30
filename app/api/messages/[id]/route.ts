import type { NextRequest } from "next/server";
import { ApiError, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { Contact } from "@/app/lib/server/models/Contact";
import { messageStatusSchema } from "@/app/lib/server/schemas";
import { toAdminMessage } from "@/app/lib/server/serializers";

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { status } = await readJson(req, messageStatusSchema);
  await connectDB();
  await requireAdmin();

  const { id } = await ctx.params;
  const message = await Contact.findById(id);
  if (!message) throw new ApiError(404, "message_not_found", "Message not found.");

  message.status = status;
  await message.save();

  return json({ message: toAdminMessage(message) });
});
