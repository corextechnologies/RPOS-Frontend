import { adminApi } from "./admin.api";
import { authApi } from "./auth.api";
import { incomeApi } from "./income.api";
import { kitchenApi } from "./kitchen.api";
import { notificationsApi } from "./notifications.api";
import { restaurantsApi } from "./restaurants.api";
import { warehouseApi } from "./warehouse.api";
import type { ApiClient } from "./contract";

/** Live HTTP client — composes domain API modules. */
export const httpClient: ApiClient = {
  ...authApi,
  ...restaurantsApi,
  ...adminApi,
  ...incomeApi,
  ...warehouseApi,
  ...kitchenApi,
  ...notificationsApi,
};
