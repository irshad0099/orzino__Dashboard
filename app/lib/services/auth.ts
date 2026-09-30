// Admin auth service — thin client for the /api/auth routes.

import { api } from "./api";

export type PublicAdmin = { id: string; email: string; role: string };

export const fetchCurrentAdmin = () => api<{ admin: PublicAdmin | null }>("/api/auth/me").then((r) => r.admin);

export const login = (email: string, password: string) =>
  api<{ admin: PublicAdmin }>("/api/auth/login", { method: "POST", body: { email, password } }).then((r) => r.admin);

export const logout = () => api<{ ok: true }>("/api/auth/logout", { method: "POST" }).then(() => {});
