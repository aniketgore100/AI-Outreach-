import { API_BASE_URL } from "@/config/env";

export class ApiRequestError extends Error {
  statusCode: number;
  errors?: unknown;

  constructor(statusCode: number, message: string, errors?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

interface ApiSuccessBody<T> {
  success: true;
  message: string;
  data: T;
}

interface ApiErrorBody {
  success: false;
  message: string;
  errors?: unknown;
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  accessToken?: string;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, accessToken, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as ApiSuccessBody<T> | ApiErrorBody | null;

  if (!response.ok || !payload || payload.success === false) {
    throw new ApiRequestError(
      response.status,
      payload?.message ?? "Something went wrong. Please try again.",
      payload && "errors" in payload ? payload.errors : undefined
    );
  }

  return payload.data;
}
