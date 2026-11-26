import { api } from "./api";

export type QuestionStatus = "pending" | "answered" | "hidden";

export type AdminQuestion = {
  id: string;
  productId: number;
  productName: string;
  name: string;
  email: string;
  question: string;
  answer: string;
  answeredAt: string | null;
  status: QuestionStatus;
  createdAt: string;
};

export type QuestionListResponse = {
  questions: AdminQuestion[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
};

export function listQuestions(filters: { page?: number; status?: QuestionStatus | "all" } = {}): Promise<QuestionListResponse> {
  const p = new URLSearchParams();
  if (filters.page) p.set("page", String(filters.page));
  if (filters.status) p.set("status", filters.status);
  const qs = p.toString();
  return api<QuestionListResponse>(`/api/questions${qs ? `?${qs}` : ""}`);
}

export const updateQuestion = (id: string, input: { answer?: string; status?: QuestionStatus }) =>
  api<{ ok: true; status: QuestionStatus; answer: string }>(`/api/questions/${id}`, { method: "PATCH", body: input });
