import type { NextRequest } from "next/server";
import { ApiError, clientIp, handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { rateLimit } from "@/app/lib/server/rateLimit";
import { loginSchema } from "@/app/lib/server/schemas";
import { AdminUser } from "@/app/lib/server/models/AdminUser";
import { startSession, verifyPassword } from "@/app/lib/server/auth";
import { toPublicAdmin } from "@/app/lib/server/serializers";

export const POST = handle(async (req: NextRequest) => {
  const { email, password } = await readJson(req, loginSchema);
  await connectDB();

  const ip = clientIp(req);
  // tighter than a typical customer login — there is only ever one or two admin accounts
  await rateLimit(`login-ip:${ip}`, 15, 15 * 60);
  await rateLimit(`login-id:${ip}:${email}`, 5, 15 * 60);

  const admin = await AdminUser.findOne({ email }).select("+passwordHash");
  const passwordOk = await verifyPassword(password, admin?.passwordHash);
  if (!admin || !passwordOk) {
    throw new ApiError(401, "invalid_credentials", "Incorrect email or password.");
  }

  await startSession(admin);
  return json({ admin: toPublicAdmin(admin) });
});
