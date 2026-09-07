import { apiFetch } from "./api-client";
import { buildQueryString } from "@/lib/query-string";
import type { Pagination } from "@/types/lead-list.types";
import type {
  EmailTemplate,
  SaveTemplatePayload,
  SendTestEmailPayload,
  SendTestEmailResult,
  TemplateStatus,
  UpdateTemplatePayload,
} from "@/types/template.types";

interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export const templateService = {
  list: (params: { page?: number; limit?: number; search?: string; status?: TemplateStatus }, accessToken: string) =>
    apiFetch<Paginated<EmailTemplate>>(`/templates${buildQueryString(params)}`, { accessToken }),

  getOne: (id: string, accessToken: string) => apiFetch<EmailTemplate>(`/templates/${id}`, { accessToken }),

  create: (payload: SaveTemplatePayload, accessToken: string) =>
    apiFetch<EmailTemplate>("/templates", { method: "POST", body: payload, accessToken }),

  update: (id: string, payload: UpdateTemplatePayload, accessToken: string) =>
    apiFetch<EmailTemplate>(`/templates/${id}`, { method: "PATCH", body: payload, accessToken }),

  remove: (id: string, accessToken: string) => apiFetch<null>(`/templates/${id}`, { method: "DELETE", accessToken }),

  duplicate: (id: string, accessToken: string) =>
    apiFetch<EmailTemplate>(`/templates/${id}/duplicate`, { method: "POST", accessToken }),

  sendTest: (id: string, payload: SendTestEmailPayload, accessToken: string) =>
    apiFetch<SendTestEmailResult>(`/templates/${id}/send-test`, { method: "POST", body: payload, accessToken }),
};
