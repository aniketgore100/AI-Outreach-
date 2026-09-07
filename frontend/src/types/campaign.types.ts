import type { EmailTemplate } from "./template.types";
import type { LeadListSummary } from "./lead-list.types";

export type CampaignStatus = "draft" | "ready" | "active" | "paused" | "completed" | "archived";
export type CampaignReplyMethod = "manual" | "ai" | "template";
export type CampaignWeekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface CampaignSchedule {
  startTime: string;
  endTime: string;
  weekdays: CampaignWeekday[];
  timeZone: string;
}

export interface CampaignSequenceConfig {
  initialTemplateId: string;
  replyMethod: CampaignReplyMethod;
  replyTemplateId: string;
  followUpEnabled: boolean;
  followUpTemplateId: string;
  followUpDelayDays: string;
}

/** Local wizard form state. Kept distinct from `CampaignDetail` (the API
 * response shape) because form fields are always strings/booleans the
 * inputs can bind to directly, while the API works with numbers and nulls. */
export interface CampaignConfigurationState {
  name: string;
  description: string;
  leadListId: string;
  schedule: CampaignSchedule;
  sequence: CampaignSequenceConfig;
}

export interface CampaignBuildContext {
  templates: EmailTemplate[];
  leadLists: LeadListSummary[];
}

export interface CampaignCompletedSteps {
  details: boolean;
  sequence: boolean;
  leadList: boolean;
  schedule: boolean;
}

export interface CampaignSummary {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  leadListId: string | null;
  startTime: string | null;
  endTime: string | null;
  timeZone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDetail {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  completedSteps: CampaignCompletedSteps;
  leadListId: string | null;
  leadList: LeadListSummary | null;
  sequence: {
    initialTemplateId: string | null;
    initialTemplate: EmailTemplate | null;
    replyMethod: CampaignReplyMethod;
    replyTemplateId: string | null;
    replyTemplate: EmailTemplate | null;
    followUpEnabled: boolean;
    followUpTemplateId: string | null;
    followUpTemplate: EmailTemplate | null;
    followUpDelayDays: number | null;
  };
  schedule: (CampaignSchedule & { updatedAt: string }) | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
}

export type UpdateCampaignDetailsPayload = CreateCampaignPayload;

export interface UpdateInitialOutreachPayload {
  templateId: string;
}

export interface UpdateReplyHandlingPayload {
  method: CampaignReplyMethod;
  templateId?: string;
}

export interface UpdateFollowUpPayload {
  enabled: boolean;
  templateId?: string;
  delayDays?: number;
}

export interface UpdateCampaignLeadListPayload {
  leadListId: string;
}

export interface UpsertCampaignSchedulePayload {
  startTime: string;
  endTime: string;
  weekdays: CampaignWeekday[];
  timeZone: string;
}

export interface FinalizeCampaignPayload {
  mode: "draft" | "launch";
}
