import { mockClient } from "./mock";
import { httpClient } from "./http";
import { apiConfig } from "./config";
import type { ApiClient } from "./contract";

export const USE_MOCK = apiConfig.useMock;

export const api: ApiClient = USE_MOCK ? mockClient : httpClient;

export { apiConfig } from "./config";
export * from "./contract";
export { queryKeys } from "./query-keys";
export { tokens } from "./tokens";
