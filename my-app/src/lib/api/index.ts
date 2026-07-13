import { mockClient } from "./mock";
import { httpClient } from "./http";
import type { ApiClient } from "./contract";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const api: ApiClient = USE_MOCK ? mockClient : httpClient;

export * from "./contract";
export { queryKeys } from "./query-keys";
export { tokens } from "./tokens";
