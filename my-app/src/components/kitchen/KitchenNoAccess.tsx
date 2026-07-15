import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";

/**
 * Shown when a kitchen user opens a page their role cannot use — a sub-chef
 * reaching a manager-only screen by typing the URL, since the nav does not link
 * there.
 *
 * This is a courtesy, not a control: the server enforces the same split and
 * answers 403 regardless. But gating on the permission rather than waiting for
 * that 403 means the page never renders a manager-only shell, and never shows an
 * empty state that reads as "there is nothing here" when the truth is "this is
 * not yours to see".
 */
export function KitchenNoAccess() {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          title="Not available"
          description="Your role does not have access to this page. Ask your kitchen manager if you need it."
        />
      </CardContent>
    </Card>
  );
}
