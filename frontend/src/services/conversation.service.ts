import { apiFetch } from "./api-client";
import { buildQueryString } from "@/lib/query-string";
import type { Pagination } from "@/types/lead-list.types";
import type {
  ConversationDetail,
  ConversationStatus,
  ConversationSummary,
  ReplyToConversationPayload,
} from "@/types/conversation.types";

interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export const conversationService = {
  list: (
    params: { page?: number; limit?: number; status?: ConversationStatus; search?: string },
    accessToken: string
  ) => apiFetch<Paginated<ConversationSummary>>(`/conversations${buildQueryString(params)}`, { accessToken }),

  getOne: (id: string, accessToken: string) => apiFetch<ConversationDetail>(`/conversations/${id}`, { accessToken }),

  reply: (id: string, payload: ReplyToConversationPayload, accessToken: string) =>
    apiFetch<ConversationDetail>(`/conversations/${id}/reply`, { method: "POST", body: payload, accessToken }),

  markRead: (id: string, accessToken: string) =>
    apiFetch<ConversationDetail>(`/conversations/${id}/read`, { method: "PATCH", accessToken }),

  setArchived: (id: string, archived: boolean, accessToken: string) =>
    apiFetch<ConversationDetail>(`/conversations/${id}/archive`, { method: "PATCH", body: { archived }, accessToken }),
};
