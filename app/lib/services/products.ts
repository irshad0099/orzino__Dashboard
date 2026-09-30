import { api } from "./api";
import { ServiceError } from "./storage";

export type ProductReview = { id: string; author: string; rating: number; comment: string; date: string };

export type AdminProduct = {
  id: string;
  legacyId?: number;
  name: string;
  category: string;
  image: string;
  description: string;
  price: number;
  originalPrice: number;
  rating: number;
  weight: string;
  stock: number;
  badge: string;
  isSale: boolean;
  isComingSoon: boolean;
  offerEndsAt: string | null;
  order: number;
  reviews: ProductReview[];
};

export type ProductInput = Omit<AdminProduct, "id" | "legacyId" | "rating" | "reviews">;

export const listProducts = () => api<{ products: AdminProduct[] }>("/api/products").then((r) => r.products);

export const getProduct = (id: string) => api<{ product: AdminProduct }>(`/api/products/${id}`).then((r) => r.product);

export const createProduct = (input: ProductInput) =>
  api<{ product: AdminProduct }>("/api/products", { method: "POST", body: input }).then((r) => r.product);

export const updateProduct = (id: string, input: Partial<ProductInput>) =>
  api<{ product: AdminProduct }>(`/api/products/${id}`, { method: "PATCH", body: input }).then((r) => r.product);

export const deleteProduct = (id: string) => api<{ ok: true }>(`/api/products/${id}`, { method: "DELETE" }).then(() => {});

export type BulkPriceResult = { updated: number; notFound: string[]; total: number; products: AdminProduct[] };

export const bulkUpdatePrices = (productIds: string[], percent: number, adjustMrp: boolean) =>
  api<BulkPriceResult>("/api/products/bulk", { method: "PATCH", body: { productIds, percent, adjustMrp } });

export async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/products/upload", { method: "POST", body: form, credentials: "same-origin" });
  } catch {
    throw new ServiceError("network_error", "We couldn't reach the server. Please check your internet connection and try again.");
  }
  let data: { url?: string; error?: { code?: string; message?: string } } | null = null;
  try {
    data = await res.json();
  } catch {
    // empty / non-JSON body
  }
  if (!res.ok || !data?.url) {
    throw new ServiceError(data?.error?.code ?? "server_error", data?.error?.message ?? "Upload failed.");
  }
  return data.url;
}
