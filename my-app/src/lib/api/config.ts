function normalizeBaseUrl(raw: string | undefined, fallback: string): string {
  let url = (raw ?? fallback).replace(/\/$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must include a scheme, e.g. http://localhost:8000/v1",
    );
  }
  // API paths are relative to /v1 — append if omitted from env.
  if (!url.endsWith("/v1")) {
    url = `${url}/v1`;
  }
  return url;
}

const baseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  "http://localhost:8000/v1",
);

export const apiConfig = {
  baseUrl,
  useMock: process.env.NEXT_PUBLIC_USE_MOCK !== "false",
  mockDemoEmail: process.env.NEXT_PUBLIC_MOCK_DEMO_EMAIL ?? "",
  mockDemoPassword: process.env.NEXT_PUBLIC_MOCK_DEMO_PASSWORD ?? "",
  /** True when the API is served through an ngrok tunnel (free tier needs extra header). */
  isNgrok: baseUrl.includes("ngrok"),
} as const;
