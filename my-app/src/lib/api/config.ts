function normalizeBaseUrl(raw: string | undefined, fallback: string): string {
  const url = (raw ?? fallback).replace(/\/$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must include a scheme, e.g. http://localhost:8000/v1",
    );
  }
  return url;
}

export const apiConfig = {
  baseUrl: normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "http://localhost:8000/v1",
  ),
  useMock: process.env.NEXT_PUBLIC_USE_MOCK !== "false",
  mockDemoEmail: process.env.NEXT_PUBLIC_MOCK_DEMO_EMAIL ?? "",
  mockDemoPassword: process.env.NEXT_PUBLIC_MOCK_DEMO_PASSWORD ?? "",
} as const;
