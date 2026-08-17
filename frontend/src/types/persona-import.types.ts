export type PersonaSourceSetStatus = "draft" | "confirmed";

export type PersonaTimePeriodPreset = "3m" | "6m" | "12m" | "all" | "custom";

export interface PersonaTimePeriod {
  preset: PersonaTimePeriodPreset;
  from: string | null;
  to: string | null;
}

export interface PersonaSourceSet {
  id: string;
  gmailConnectionId: string;
  status: PersonaSourceSetStatus;
  timePeriod: PersonaTimePeriod;
  candidateCount: number;
  selectedCount: number;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PersonaFilterReason = "internal_recipient" | "auto_generated" | "too_short" | "too_long" | null;

export interface PersonaSourceEmail {
  id: string;
  subject: string;
  snippet: string;
  recipientDomain: string;
  duplicateCount: number;
  sentAt: string;
  filterReason: PersonaFilterReason;
  included: boolean;
}

export interface PersonaCandidatesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PersonaCandidatesResult {
  set: PersonaSourceSet;
  items: PersonaSourceEmail[];
  pagination: PersonaCandidatesPagination;
}

export interface StartImportPayload {
  timePeriod: {
    preset: PersonaTimePeriodPreset;
    from?: string;
    to?: string;
  };
}

export interface UpdateSelectionPayload {
  includeAll?: boolean;
  updates?: Array<{ id: string; included: boolean }>;
}

export interface UpdateSelectionResult {
  selectedCount: number;
}
