import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";

/**
 * Shown when the API answers `missing_kitchen_assignment` (409). Only an Admin
 * can assign a kitchen, so this offers no retry — there is nothing the user can
 * do from here.
 */
export function KitchenUnassigned() {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          title="No kitchen assigned"
          description="Your account is not assigned to a kitchen yet. Ask your Admin to assign one, then sign in again."
        />
      </CardContent>
    </Card>
  );
}
