import { apiFetch } from "./api-client";
import { buildQueryString } from "@/lib/query-string";
import type { CreateLeadListPayload, Lead, LeadListDetail, LeadListSummary, Pagination } from "@/types/lead-list.types";

interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export const leadListService = {
  create: (payload: CreateLeadListPayload, accessToken: string) =>
    apiFetch<LeadListDetail>("/lead-lists", { method: "POST", body: payload, accessToken }),

  list: (params: { page?: number; limit?: number; search?: string }, accessToken: string) =>
    apiFetch<Paginated<LeadListSummary>>(`/lead-lists${buildQueryString(params)}`, { accessToken }),

  getOne: (id: string, accessToken: string) => apiFetch<LeadListDetail>(`/lead-lists/${id}`, { accessToken }),

  remove: (id: string, accessToken: string) =>
    apiFetch<null>(`/lead-lists/${id}`, { method: "DELETE", accessToken }),

  listLeads: (
    id: string,
    params: { page?: number; limit?: number; search?: string; companyName?: string; jobTitle?: string; location?: string },
    accessToken: string
  ) => apiFetch<Paginated<Lead>>(`/lead-lists/${id}/leads${buildQueryString(params)}`, { accessToken }),

  getLead: (id: string, leadId: string, accessToken: string) =>
    apiFetch<Lead>(`/lead-lists/${id}/leads/${leadId}`, { accessToken }),
};
