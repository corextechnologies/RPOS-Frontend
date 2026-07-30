import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";

/** A stub screen until its chunk lands. Removed as each real screen ships. */
export function SubKitchenPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState title={title} description={description} />
      </CardContent>
    </Card>
  );
}
