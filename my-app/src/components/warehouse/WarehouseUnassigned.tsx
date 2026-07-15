import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";

/**
 * Shown when the API answers `missing_warehouse_assignment` (409). Only an Admin
 * can assign a warehouse, so this offers no retry — there is nothing the manager
 * can do from here.
 */
export function WarehouseUnassigned() {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          title="No warehouse assigned"
          description="Your account is not assigned to a warehouse yet. Ask your Admin to assign one, then sign in again."
        />
      </CardContent>
    </Card>
  );
}
