import "server-only";
import { RateLimit } from "./models/RateLimit";
import { ApiError } from "./http";

/**
 * Fixed-window counter stored in MongoDB (works across serverless instances).
 * One atomic upsert either increments the live window or starts a fresh one.
 * Call after connectDB(). Throws a 429 ApiError once `limit` is exceeded.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  // Local-development convenience only (never honoured in production): without a proxy there is
  // no x-forwarded-for header, so all local traffic shares one bucket.
  if (process.env.RATE_LIMIT_DISABLED === "true" && process.env.NODE_ENV !== "production") return;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowSec * 1000);

  const doc = await RateLimit.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: { $cond: [{ $gt: ["$expiresAt", now] }, { $add: ["$count", 1] }, 1] },
          expiresAt: { $cond: [{ $gt: ["$expiresAt", now] }, "$expiresAt", windowEnd] },
        },
      },
    ],
    { upsert: true, returnDocument: "after", updatePipeline: true }
  );

  if (doc && doc.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((doc.expiresAt.getTime() - now.getTime()) / 1000));
    throw new ApiError(429, "rate_limited", "Too many attempts. Please wait a few minutes and try again.", {
      headers: { "Retry-After": String(retryAfter) },
    });
  }
}
