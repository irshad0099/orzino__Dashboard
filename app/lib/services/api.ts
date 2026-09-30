// Tiny fetch wrapper for the /api routes. Turns server errors into ServiceError so
// UI code can just show `error.message`.

import { ServiceError } from "./storage";

type ApiInit = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown };

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ServiceError(
      "network_error",
      "We couldn't reach the server. Please check your internet connection and try again."
    );
  }

  let data: { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null = null;
  try {
    data = await res.json();
  } catch {
    // empty / non-JSON body
  }

  if (!res.ok) {
    throw new ServiceError(
      data?.error?.code ?? "server_error",
      data?.error?.message ?? "Something went wrong. Please try again.",
      data?.error?.fields
    );
  }
  return data as T;
}
