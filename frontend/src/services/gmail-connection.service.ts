import { apiFetch } from "./api-client";
import type { GmailConnection, GmailConnectionsState } from "@/types/gmail-connection.types";

export const gmailConnectionService = {
  list: (accessToken: string) => apiFetch<GmailConnectionsState>("/gmail-connections", { accessToken }),

  startGoogleOAuth: (accessToken: string, loginHint?: string) =>
    apiFetch<{ authorizationUrl: string }>("/gmail-connections/google/start", {
      method: "POST",
      body: loginHint ? { loginHint } : {},
      accessToken,
    }),

  disconnect: (id: string, accessToken: string) =>
    apiFetch<GmailConnection>(`/gmail-connections/${id}/disconnect`, { method: "POST", accessToken }),
};
