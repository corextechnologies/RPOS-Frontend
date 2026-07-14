import { adminApi } from "./admin.api";
import { authApi } from "./auth.api";
import { incomeApi } from "./income.api";
import { restaurantsApi } from "./restaurants.api";
import type { ApiClient } from "./contract";

/** Live HTTP client — composes domain API modules. */
export const httpClient: ApiClient = {
  ...authApi,
  ...restaurantsApi,
  ...adminApi,
  ...incomeApi,
};
