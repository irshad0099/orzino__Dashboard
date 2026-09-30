import type { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { ApiError, assertSameOrigin, handle, json } from "@/app/lib/server/http";
import { connectDB } from "@/app/lib/server/db";
import { requireAdmin } from "@/app/lib/server/auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  await connectDB();
  await requireAdmin();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ApiError(
      503,
      "blob_not_configured",
      "Image uploads aren't set up yet — enable Vercel Blob storage on this project (Storage tab) or paste an image path/URL directly."
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    throw new ApiError(400, "bad_request", "Expected a multipart/form-data upload.");
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(400, "no_file", "No file was uploaded.");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ApiError(415, "unsupported_type", "Only JPEG, PNG, WebP or AVIF images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new ApiError(413, "too_large", "Image must be 5MB or smaller.");
  }

  const ext = file.type.split("/")[1];
  const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const blob = await put(filename, file, { access: "public", contentType: file.type });

  return json({ url: blob.url });
});
