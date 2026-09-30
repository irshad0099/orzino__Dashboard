import { handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { getSessionAdmin } from "@/app/lib/server/auth";
import { toPublicAdmin } from "@/app/lib/server/serializers";

// Always 200: signed-out is a normal state, not an error (keeps the browser console clean).
export const GET = handle(async () => {
  await connectDB();
  const admin = await getSessionAdmin();
  return json({ admin: admin ? toPublicAdmin(admin) : null });
});
