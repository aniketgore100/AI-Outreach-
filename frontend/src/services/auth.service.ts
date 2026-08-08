import { apiFetch } from "./api-client";
import type { AuthSession, LoginPayload, RegisterPayload, User } from "@/types/auth.types";

export const authService = {
  register: (payload: RegisterPayload) =>
    apiFetch<AuthSession>("/auth/register", { method: "POST", body: payload }),

  login: (payload: LoginPayload) => apiFetch<AuthSession>("/auth/login", { method: "POST", body: payload }),

  logout: () => apiFetch<null>("/auth/logout", { method: "POST" }),

  me: (accessToken: string) => apiFetch<User>("/auth/me", { method: "GET", accessToken }),

  refresh: () => apiFetch<AuthSession>("/auth/refresh", { method: "POST" }),
};
