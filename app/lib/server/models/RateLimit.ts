import { Schema, model, models, type Model } from "mongoose";

export interface IRateLimit {
  key: string;
  count: number;
  expiresAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true },
  // MongoDB's TTL monitor deletes the document shortly after this moment.
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const RateLimit: Model<IRateLimit> =
  (models.AdminRateLimit as Model<IRateLimit>) || model<IRateLimit>("AdminRateLimit", rateLimitSchema, "adminratelimits");
