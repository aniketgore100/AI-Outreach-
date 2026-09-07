export type ConversationStatus = "open" | "archived";
export type MessageDirection = "outbound" | "inbound";

export interface ConversationMessage {
  id: string;
  direction: MessageDirection;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  snippet: string;
  sentAt: string;
  readAt: string | null;
}

export interface ConversationSummary {
  id: string;
  leadId: string | null;
  leadName: string | null;
  leadEmail: string | null;
  leadCompany: string | null;
  campaignId: string | null;
  campaignName: string | null;
  subject: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessageDirection: MessageDirection | null;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
}

export interface ReplyToConversationPayload {
  bodyHtml: string;
  bodyText?: string;
}
