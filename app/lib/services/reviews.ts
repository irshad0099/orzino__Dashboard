import { api } from "./api";

export type AdminReview = {
  id: string;
  productId: number;
  productName: string;
  productImage: string;
  orderId: string;
  authorName: string;
  rating: number;
  comment: string;
  media: { type: "image" | "video"; url: string }[];
  status: "published" | "hidden";
  createdAt: string;
};

export type ReviewListResponse = {
  reviews: AdminReview[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  publishedCount: number;
  hiddenCount: number;
};

export function listReviews(filters: { page?: number; status?: string; rating?: number } = {}): Promise<ReviewListResponse> {
  const p = new URLSearchParams();
  if (filters.page) p.set("page", String(filters.page));
  if (filters.status) p.set("status", filters.status);
  if (filters.rating) p.set("rating", String(filters.rating));
  const qs = p.toString();
  return api<ReviewListResponse>(`/api/reviews${qs ? `?${qs}` : ""}`);
}

export const setReviewStatus = (id: string, status: "published" | "hidden") =>
  api<{ ok: true }>(`/api/reviews/${id}`, { method: "PATCH", body: { status } });
