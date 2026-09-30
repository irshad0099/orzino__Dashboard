import { api } from "./api";

export type MessageStatus = "new" | "read" | "resolved";

export type AdminMessage = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  status: MessageStatus;
  createdAt: string;
};

export type MessageListResponse = {
  messages: AdminMessage[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  newCount: number;
};

export function listMessages(filters: { page?: number; status?: MessageStatus | "" } = {}): Promise<MessageListResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return api<MessageListResponse>(`/api/messages${qs ? `?${qs}` : ""}`);
}

export const updateMessageStatus = (id: string, status: MessageStatus) =>
  api<{ message: AdminMessage }>(`/api/messages/${id}`, { method: "PATCH", body: { status } }).then((r) => r.message);
