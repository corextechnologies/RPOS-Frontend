import { ApiError } from "@/lib/types/super-admin";

interface SuccessEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown[];
  };
  detail?: string;
  message?: string;
}

export function unwrapData<T>(json: unknown): T {
  if (json !== null && typeof json === "object" && "data" in json) {
    return (json as SuccessEnvelope<T>).data;
  }
  return json as T;
}

export function parseApiError(json: unknown, status: number): ApiError {
  const body = (json ?? {}) as ErrorEnvelope;
  const message =
    body.error?.message ??
    body.detail ??
    body.message ??
    "Request failed";
  return new ApiError(message, status, body.error?.code);
}
