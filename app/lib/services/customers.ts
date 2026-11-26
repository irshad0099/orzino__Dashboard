import { api } from "./api";

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  addresses: { label: string; name: string; phone: string; address: string; isDefault: boolean }[];
  orders: number;
  totalSpent: number; // excludes cancelled orders
  lastOrderAt: string | null;
};

export type CustomerListResponse = {
  customers: AdminCustomer[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totalAll: number;
  newThisWeek: number;
};

function params(filters: { page?: number; q?: string }) {
  const p = new URLSearchParams();
  if (filters.page) p.set("page", String(filters.page));
  if (filters.q) p.set("q", filters.q);
  return p;
}

export function listCustomers(filters: { page?: number; q?: string } = {}): Promise<CustomerListResponse> {
  const qs = params(filters).toString();
  return api<CustomerListResponse>(`/api/customers${qs ? `?${qs}` : ""}`);
}

export function exportCustomersUrl(q = ""): string {
  const p = params({ q });
  p.set("format", "csv");
  return `/api/customers?${p.toString()}`;
}
