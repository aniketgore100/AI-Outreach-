export const TEMPLATE_STATUSES = ["draft", "active"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SaveTemplatePayload {
  name: string;
  subject?: string;
  bodyHtml?: string;
  status?: TemplateStatus;
}

export type UpdateTemplatePayload = Partial<SaveTemplatePayload>;

export interface SendTestEmailPayload {
  gmailConnectionId: string;
  recipientEmail: string;
}

export interface SendTestEmailResult {
  sentTo: string;
  from: string;
}
