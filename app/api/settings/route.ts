import type { NextRequest } from "next/server";
import { handle, json, readJson } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";
import { SiteSettings } from "@/app/lib/server/models/SiteSettings";
import { siteSettingsSchema } from "@/app/lib/server/schemas";

const DEFAULTS = {
  gstRate: 0.05,
  deliveryCharge: 30,
  freeDeliveryMinPacks: 2,
  maxPerProduct: 8,
  etaMinDays: 3,
  etaMaxDays: 5,
};

export const GET = handle(async () => {
  await connectDB();
  await requireAdmin();

  const doc = await SiteSettings.findById("default").lean();
  return json({ settings: doc ?? { _id: "default", ...DEFAULTS } });
});

export const PATCH = handle(async (req: NextRequest) => {
  const input = await readJson(req, siteSettingsSchema);
  await connectDB();
  await requireAdmin();

  const doc = await SiteSettings.findByIdAndUpdate(
    "default",
    { $set: input },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return json({ settings: doc });
});
