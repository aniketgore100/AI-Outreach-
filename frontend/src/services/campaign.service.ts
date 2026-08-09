import { apiFetch } from "./api-client";
import { buildQueryString } from "@/lib/query-string";
import type { Pagination } from "@/types/lead-list.types";
import type {
  CampaignDetail,
  CampaignStatus,
  CampaignSummary,
  CreateCampaignPayload,
  FinalizeCampaignPayload,
  UpdateCampaignDetailsPayload,
  UpdateCampaignLeadListPayload,
  UpdateFollowUpPayload,
  UpdateInitialOutreachPayload,
  UpdateReplyHandlingPayload,
  UpsertCampaignSchedulePayload,
} from "@/types/campaign.types";

interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export const campaignService = {
  list: (params: { page?: number; limit?: number; search?: string; status?: CampaignStatus }, accessToken: string) =>
    apiFetch<Paginated<CampaignSummary>>(`/campaigns${buildQueryString(params)}`, { accessToken }),

  getOne: (id: string, accessToken: string) => apiFetch<CampaignDetail>(`/campaigns/${id}`, { accessToken }),

  create: (payload: CreateCampaignPayload, accessToken: string) =>
    apiFetch<CampaignDetail>("/campaigns", { method: "POST", body: payload, accessToken }),

  updateDetails: (id: string, payload: UpdateCampaignDetailsPayload, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/details`, { method: "PATCH", body: payload, accessToken }),

  updateInitialOutreach: (id: string, payload: UpdateInitialOutreachPayload, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/sequence/initial-outreach`, {
      method: "PATCH",
      body: payload,
      accessToken,
    }),

  updateReplyHandling: (id: string, payload: UpdateReplyHandlingPayload, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/sequence/reply-handling`, {
      method: "PATCH",
      body: payload,
      accessToken,
    }),

  updateFollowUp: (id: string, payload: UpdateFollowUpPayload, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/sequence/follow-up`, { method: "PATCH", body: payload, accessToken }),

  updateLeadList: (id: string, payload: UpdateCampaignLeadListPayload, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/lead-list`, { method: "PATCH", body: payload, accessToken }),

  upsertSchedule: (id: string, payload: UpsertCampaignSchedulePayload, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/schedule`, { method: "PUT", body: payload, accessToken }),

  finalize: (id: string, payload: FinalizeCampaignPayload, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/finalize`, { method: "POST", body: payload, accessToken }),

  activate: (id: string, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/activate`, { method: "POST", accessToken }),

  pause: (id: string, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/pause`, { method: "POST", accessToken }),

  resume: (id: string, accessToken: string) =>
    apiFetch<CampaignDetail>(`/campaigns/${id}/resume`, { method: "POST", accessToken }),
};
