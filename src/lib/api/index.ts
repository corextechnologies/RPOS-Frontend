import { httpClient } from "./http";
import { mockClient } from "./mock";
import type { ApiClient } from "./contract";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/**
 * Single entry point for data access. Swaps between the persistent mock
 * backend and the live FastAPI backend based on NEXT_PUBLIC_USE_MOCK.
 */
export const api: ApiClient = USE_MOCK ? mockClient : httpClient;

export * from "./contract";
export { tokens } from "./tokens";
