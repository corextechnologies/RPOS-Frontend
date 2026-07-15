"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CountVariance } from "@/components/kitchen/counts/CountVariance";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCreateKitchenCount } from "@/lib/hooks/use-kitchen-counts";
import { useKitchenInventory } from "@/lib/hooks/use-kitchen-inventory";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

export default function NewKitchenCountPage() {
  const router = useRouter();
  const { can } = useAuth();
  const allowed = can("kitchen-counts:create");
  const inventory = useKitchenInventory();
  const createCount = useCreateKitchenCount();

  // Holds only the lines the user actually edited, keyed by inventory row id —
  // which is already unique per product+batch, so the duplicate_count_line
  // conflict cannot be constructed from this form.
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const rows = useMemo(() => inventory.data ?? [], [inventory.data]);

  const unassigned = isMissingKitchenAssignment(inventory.error);

  const lines = rows.map((item) => {
    // Unedited lines read as system stock, so a count is a matter of correcting
    // the rows that are wrong rather than retyping the ones that are right.
    // Deriving this beats seeding state in an effect: there is no render where
    // the inputs are empty, and late-arriving inventory cannot clobber edits.
    const raw = edited[item.id] ?? String(item.quantity);
    const value = Number(raw);
    const valid = raw !== "" && Number.isInteger(value) && value >= 0;
    return {
      item,
      raw,
      valid,
      variance: valid ? value - item.quantity : 0,
    };
  });

  const invalidCount = lines.filter((line) => !line.valid).length;
  const changedCount = lines.filter((line) => line.valid && line.variance !== 0).length;

  const submit = async () => {
    await createCount.mutateAsync({
      notes: notes.trim() || undefined,
      lines: lines.map(({ item, raw }) => ({
        product_id: item.product_id,
        counted_quantity: Number(raw),
        batch_code: item.batch_code || undefined,
      })),
    });
    setConfirmOpen(false);
    router.push("/kitchen/counts");
  };

  const backLink = (
    <Button variant="ghost" size="icon" asChild>
      <Link href="/kitchen/counts" aria-label="Back">
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {backLink}
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            New count
          </h1>
          <p className="text-sm text-muted">
            Enter what is physically on the shelf for each batch.
          </p>
        </div>
      </div>

      {!allowed ? (
        <KitchenNoAccess />
      ) : unassigned ? (
        <KitchenUnassigned />
      ) : inventory.isPending ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : inventory.isError ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              description="Failed to load inventory."
              onRetry={() => inventory.refetch()}
            />
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="Nothing to count"
              description="There is no stock on hand in your kitchen yet."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Count lines</CardTitle>
              <CardDescription>
                Each line is pre-filled with system stock. Change only what does
                not match.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">System</TableHead>
                    <TableHead className="w-[140px]">Counted</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(({ item, raw, valid, variance }) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-content">
                        {item.product.name}
                      </TableCell>
                      <TableCell>
                        {item.batch_code ? (
                          <span className="text-muted">{item.batch_code}</span>
                        ) : (
                          <Badge variant="secondary">No batch</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted">
                        {item.quantity}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          inputMode="numeric"
                          aria-label={`Counted quantity for ${item.product.name}`}
                          aria-invalid={!valid}
                          value={raw}
                          onChange={(e) =>
                            setEdited((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {valid ? <CountVariance value={variance} /> : <span className="text-danger">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="count-notes">Notes (optional)</Label>
                <Textarea
                  id="count-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Nightly count"
                  rows={3}
                />
              </div>

              {invalidCount > 0 && (
                <p className="text-sm text-danger">
                  {invalidCount} {invalidCount === 1 ? "line needs" : "lines need"} a
                  whole number of 0 or more.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {changedCount === 0
                    ? "Everything matches system stock."
                    : `${changedCount} ${changedCount === 1 ? "line differs" : "lines differ"} from system stock.`}
                </p>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/kitchen/counts">Cancel</Link>
                  </Button>
                  <Button
                    type="button"
                    disabled={invalidCount > 0 || createCount.isPending}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Review and submit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit this count?"
        // Spelled out because this is not a report: it rewrites stock and tells
        // Admin. The number of affected lines is the part worth pausing on.
        description={
          changedCount === 0
            ? "Every line matches system stock, so nothing will change. Admin is notified that the count was taken."
            : `${changedCount} ${changedCount === 1 ? "product" : "products"} will be adjusted to the counted quantity, and Admin will be notified. This cannot be undone from here.`
        }
        confirmLabel="Submit count"
        loading={createCount.isPending}
        onConfirm={submit}
      />
    </div>
  );
}
