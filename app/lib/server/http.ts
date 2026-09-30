import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ConfigError, getEnv } from "./env";

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    opts: { fields?: Record<string, string>; headers?: Record<string, string> } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = opts.fields;
    this.headers = opts.headers;
  }
}

const MAX_BODY_BYTES = 20 * 1024;

/** JSON response that is never cached (everything here is per-user data). */
export function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...init.headers },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return json(
      { error: { code: error.code, message: error.message, fields: error.fields } },
      { status: error.status, headers: error.headers }
    );
  }

  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".") || "_";
      if (!fields[path]) fields[path] = issue.message;
    }
    return json(
      { error: { code: "validation_error", message: error.issues[0]?.message ?? "Invalid request.", fields } },
      { status: 400 }
    );
  }

  const name = (error as { name?: string })?.name ?? "";
  if (name === "MongooseServerSelectionError" || name === "MongoNetworkError" || name === "MongoServerSelectionError") {
    console.error("[api] database unreachable:", (error as Error).message);
    return json(
      { error: { code: "db_unavailable", message: "We're having trouble reaching our database. Please try again shortly." } },
      { status: 503 }
    );
  }

  if (error instanceof ConfigError) {
    console.error("[api] configuration error:", error.message);
    let expose = false;
    try {
      expose = !getEnv().isProduction;
    } catch {
      expose = process.env.NODE_ENV !== "production";
    }
    return json(
      { error: { code: "server_misconfigured", message: expose ? error.message : "The server is not configured correctly." } },
      { status: 500 }
    );
  }

  if (name === "ValidationError") {
    return json({ error: { code: "validation_error", message: (error as Error).message } }, { status: 400 });
  }

  console.error("[api] unexpected error:", error);
  return json({ error: { code: "server_error", message: "Something went wrong. Please try again." } }, { status: 500 });
}

/** Wraps a route handler so every thrown error becomes a clean JSON response. */
export function handle<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** CSRF defence for cookie-authenticated mutations (on top of SameSite). */
export function assertSameOrigin(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "forbidden_origin", "Cross-site requests are not allowed.");
  }
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new ApiError(403, "forbidden_origin", "Invalid request origin.");
    }
    const requestHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (originHost !== requestHost) {
      throw new ApiError(403, "forbidden_origin", "Cross-site requests are not allowed.");
    }
  }
}

/** Origin check + JSON content-type + size cap + zod validation. */
export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  assertSameOrigin(req);

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Requests must be sent as application/json.");
  }

  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request body is too large.");
  }

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  return schema.parse(data);
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

/** MongoDB duplicate-key error → which unique index was hit (or null). */
export function duplicateKey(error: unknown): string | null {
  const e = error as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
  if (e?.code !== 11000) return null;
  const key = e.keyPattern ? Object.keys(e.keyPattern)[0] : undefined;
  return key ?? e.message ?? "unknown";
}
