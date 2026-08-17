import { apiFetch } from "./api-client";
import type {
  PersonaCandidatesResult,
  PersonaSourceSet,
  StartImportPayload,
  UpdateSelectionPayload,
  UpdateSelectionResult,
} from "@/types/persona-import.types";

export const personaImportService = {
  startImport: (gmailConnectionId: string, payload: StartImportPayload, accessToken: string) =>
    apiFetch<PersonaSourceSet>(`/gmail-connections/${gmailConnectionId}/persona-import`, {
      method: "POST",
      body: payload,
      accessToken,
    }),

  listSets: (gmailConnectionId: string, accessToken: string) =>
    apiFetch<PersonaSourceSet[]>(`/gmail-connections/${gmailConnectionId}/persona-import`, { accessToken }),

  listCandidates: (setId: string, accessToken: string, page = 1, limit = 50) =>
    apiFetch<PersonaCandidatesResult>(
      `/gmail-connections/persona-import/${setId}/candidates?page=${page}&limit=${limit}`,
      { accessToken }
    ),

  updateSelection: (setId: string, payload: UpdateSelectionPayload, accessToken: string) =>
    apiFetch<UpdateSelectionResult>(`/gmail-connections/persona-import/${setId}/candidates`, {
      method: "PATCH",
      body: payload,
      accessToken,
    }),

  confirmImport: (setId: string, accessToken: string) =>
    apiFetch<PersonaSourceSet>(`/gmail-connections/persona-import/${setId}/confirm`, {
      method: "POST",
      accessToken,
    }),
};
