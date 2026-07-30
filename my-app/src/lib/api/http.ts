import { adminApi } from "./admin.api";
import { authApi } from "./auth.api";
import { branchApi } from "./branch.api";
import { incomeApi } from "./income.api";
import { kitchenApi } from "./kitchen.api";
import { notificationsApi } from "./notifications.api";
import { restaurantsApi } from "./restaurants.api";
import { subKitchenApi } from "./sub-kitchen.api";
import { uploadsApi } from "./uploads.api";
import { warehouseApi } from "./warehouse.api";
import type { ApiClient } from "./contract";

/**
 * Live HTTP client — composes domain API modules.
 *
 * The POS (`pos.api.ts`) is not here on purpose: it is not part of this
 * contract, has no mock, and uses a device-bound token via its own client.
 */
export const httpClient: ApiClient = {
  ...authApi,
  ...restaurantsApi,
  ...adminApi,
  ...incomeApi,
  ...warehouseApi,
  ...kitchenApi,
  ...notificationsApi,
  ...branchApi,
  ...subKitchenApi,
  ...uploadsApi,
};
