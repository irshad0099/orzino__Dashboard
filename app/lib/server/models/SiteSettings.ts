import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

// Mirrors app/lib/server/models/SiteSettings.ts in the customer site (orzino) — this app
// owns and writes this single-document collection; orzino only reads it.

export interface ISiteSettings {
  _id: "default";
  gstRate: number; // 0-1, e.g. 0.05 = 5%
  deliveryCharge: number;
  freeDeliveryMinPacks: number;
  maxPerProduct: number;
  etaMinDays: number;
  etaMaxDays: number;
  updatedAt: Date;
  createdAt: Date;
}

export type SiteSettingsDoc = HydratedDocument<ISiteSettings>;

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    _id: { type: String, default: "default" },
    gstRate: { type: Number, required: true, min: 0, max: 1 },
    deliveryCharge: { type: Number, required: true, min: 0 },
    freeDeliveryMinPacks: { type: Number, required: true, min: 1 },
    maxPerProduct: { type: Number, required: true, min: 1 },
    etaMinDays: { type: Number, required: true, min: 0 },
    etaMaxDays: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const SiteSettings: Model<ISiteSettings> =
  (models.SiteSettings as Model<ISiteSettings>) || model<ISiteSettings>("SiteSettings", siteSettingsSchema);
