import type { NextRequest } from "next/server";
import { ApiError, clientIp, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { rateLimit } from "@/app/lib/server/rateLimit";
import { adminChangePasswordSchema } from "@/app/lib/server/schemas";
import { AdminUser } from "@/app/lib/server/models/AdminUser";
import { hashPassword, requireAdmin, startSession, verifyPassword } from "@/app/lib/server/auth";

export const POST = handle(async (req: NextRequest) => {
  const { currentPassword, newPassword } = await readJson(req, adminChangePasswordSchema);
  await connectDB();
  const sessionAdmin = await requireAdmin();
  await rateLimit(`admin-chpw:${sessionAdmin.id}:${clientIp(req)}`, 8, 15 * 60);

  const admin = await AdminUser.findById(sessionAdmin._id).select("+passwordHash");
  if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
    throw new ApiError(400, "invalid_credentials", "Your current password is incorrect.");
  }

  admin.passwordHash = await hashPassword(newPassword);
  admin.tokenVersion += 1; // signs out every other session
  await admin.save();

  await startSession(admin); // keep THIS browser signed in with the new token version
  return json({ ok: true });
});
