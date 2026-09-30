import type { NextRequest } from "next/server";
import { assertSameOrigin, handle, json } from "@/app/lib/server/http";
import { endSession } from "@/app/lib/server/auth";

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  await endSession();
  return json({ ok: true });
});
