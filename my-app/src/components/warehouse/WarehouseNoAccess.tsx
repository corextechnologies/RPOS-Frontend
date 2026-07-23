import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";

/**
 * Shown when a warehouse user opens a page their role cannot use — warehouse
 * staff reaching Staff management by typing the URL, since the nav does not
 * link there.
 *
 * Courtesy, not a control: the server enforces the same split with 403.
 */
export function WarehouseNoAccess() {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          title="Not available"
          description="Your role does not have access to this page. Ask your warehouse manager if you need it."
        />
      </CardContent>
    </Card>
  );
}
