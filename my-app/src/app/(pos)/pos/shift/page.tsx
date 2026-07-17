"use client";

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/pos/Money";
import { StubTaxBanner } from "@/components/pos/StubTaxBanner";
import { ManagerApprovalDialog } from "@/components/pos/ManagerApprovalDialog";
import { CashMovementDialog } from "@/components/pos/CashMovementDialog";
import {
  useCloseShift,
  useCurrentShift,
  useOpenShift,
  useShiftReport,
} from "@/lib/hooks/use-pos-shift";
import { usePosSession, usePosCurrency } from "@/lib/pos/pos-session";
import { isApiCode, POS_ERROR, posErrorMessage } from "@/lib/api/errors";
import { parseDecimalToMinor } from "@/lib/money";
import { toast } from "sonner";

export default function ShiftPage() {
  const { can } = usePosSession();
  const { data: shift, isLoading } = useCurrentShift();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Loading shift" />
      </div>
    );
  }

  if (!shift || shift.status === "CLOSED") {
    return <OpenShift canOpen={can("SHIFT_OPEN")} />;
  }

  return <OpenShiftView shiftId={shift.id} canClose={can("SHIFT_CLOSE")} />;
}

function OpenShift({ canOpen }: { canOpen: boolean }) {
  const [float, setFloat] = useState("");
  const open = useOpenShift();
  const { minorUnits } = usePosCurrency();

  if (!canOpen) {
    return (
      <Empty
        title="No shift open"
        body="You don't have permission to open a shift. Ask a manager."
      />
    );
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open a shift</CardTitle>
          <CardDescription>Count the drawer before you start selling.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="float">Opening float</Label>
            <Input
              id="float"
              inputMode="decimal"
              autoFocus
              className="h-14 text-center text-2xl tabular-nums"
              placeholder="0.00"
              value={float}
              onChange={(e) => setFloat(e.target.value)}
            />
          </div>
          <Button
            className="h-12 w-full text-base"
            disabled={!float || open.isPending}
            onClick={() => {
              try {
                open.mutate({ opening_float_minor: parseDecimalToMinor(float, minorUnits) });
              } catch {
                toast.error("Enter a valid amount");
              }
            }}
          >
            {open.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Open shift
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function OpenShiftView({ shiftId, canClose }: { shiftId: number; canClose: boolean }) {
  const { data: report, isLoading } = useShiftReport(shiftId);
  const { can } = usePosSession();
  const { minorUnits } = usePosCurrency();
  const close = useCloseShift();

  const [declared, setDeclared] = useState("");
  const [movementOpen, setMovementOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);

  async function submitClose() {
    let declaredMinor: number;
    try {
      declaredMinor = parseDecimalToMinor(declared, minorUnits);
    } catch {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      const res = await close.mutateAsync({
        shiftId,
        input: { declared_cash_minor: declaredMinor },
      });
      toast.success(
        res.variance_minor === 0 ? "Shift closed — drawer balanced" : "Shift closed",
      );
    } catch (err) {
      if (isApiCode(err, POS_ERROR.VARIANCE_NEEDS_APPROVAL)) {
        setApprovalOpen(true);
        return;
      }
      toast.error(posErrorMessage(err));
    }
  }

  if (isLoading || !report) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Loading report" />
      </div>
    );
  }

  const closed = report.status === "CLOSED";

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <StubTaxBanner />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">
              {closed ? "Z report" : "X report"}
            </CardTitle>
            <CardDescription>
              {closed ? "Shift closed" : "Shift open — running totals"}
            </CardDescription>
          </div>
          {can("DRAWER_OPEN") && !closed && (
            <Button variant="outline" size="sm" onClick={() => setMovementOpen(true)}>
              <Wallet className="mr-1.5 size-3.5" aria-hidden />
              Drawer
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <dl className="divide-y divide-line text-sm">
            <Row label="Opening float" minor={report.opening_float_minor} />
            <Row label="Gross sales" minor={report.gross_sales_minor} />
            <Row label="Discounts" minor={-report.discounts_minor} />
            <Row label="Refunds" minor={-report.refunds_minor} />
            <Row label="Tax" minor={report.tax_minor} />
            <Row label="Net sales" minor={report.net_sales_minor} strong />
            <div className="flex justify-between py-2">
              <dt className="text-muted">Orders</dt>
              <dd className="tabular-nums text-content">{report.order_count}</dd>
            </div>
          </dl>

          {report.by_method.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">
                By method
              </p>
              <dl className="divide-y divide-line text-sm">
                {report.by_method.map((m) => (
                  <div key={m.method} className="flex justify-between py-2">
                    <dt className="capitalize text-muted">
                      {m.method.toLowerCase()}{" "}
                      <span className="text-faint">×{m.count}</span>
                    </dt>
                    <dd>
                      <Money minor={m.amount_minor} className="text-content" />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {report.cash_movements.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">
                Drawer
              </p>
              <ul className="divide-y divide-line text-sm">
                {report.cash_movements.map((m) => (
                  <li key={m.id} className="flex justify-between py-2">
                    <span className="capitalize text-muted">
                      {m.type.toLowerCase().replace(/_/g, " ")}
                    </span>
                    <Money minor={m.amount_minor} className="text-content" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/*
        The blind close. While the shift is open the server omits
        `expected_cash_minor` and nothing above reconstructs it — the cashier
        declares what they counted with no target visible. Only after closing
        does the server return expected/variance, and only then is it shown.
      */}
      {closed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Count</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-line text-sm">
              {report.declared_cash_minor != null && (
                <Row label="Declared" minor={report.declared_cash_minor} />
              )}
              {report.expected_cash_minor != null && (
                <Row label="Expected" minor={report.expected_cash_minor} />
              )}
              {report.variance_minor != null && (
                <div className="flex justify-between py-2">
                  <dt className="font-medium text-content">Variance</dt>
                  <dd>
                    <Money
                      minor={report.variance_minor}
                      emphasis
                      className={
                        report.variance_minor === 0
                          ? "text-positive"
                          : "text-danger"
                      }
                    />
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      ) : (
        canClose && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Close shift</CardTitle>
              <CardDescription>
                Count the drawer and enter the total. You won&apos;t see the expected figure
                until after you close.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="declared">Counted cash</Label>
                <Input
                  id="declared"
                  inputMode="decimal"
                  className="h-14 text-center text-2xl tabular-nums"
                  placeholder="0.00"
                  value={declared}
                  onChange={(e) => setDeclared(e.target.value)}
                />
              </div>
              <Button
                className="h-12 w-full text-base"
                disabled={!declared || close.isPending}
                onClick={() => void submitClose()}
              >
                {close.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                Close shift
              </Button>
            </CardContent>
          </Card>
        )
      )}

      <CashMovementDialog open={movementOpen} onOpenChange={setMovementOpen} />

      <ManagerApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        title="Variance needs approval"
        description="The counted cash is outside the allowed variance. A manager must approve this close."
        onApproved={submitClose}
      />
    </div>
  );
}

function Row({ label, minor, strong }: { label: string; minor: number; strong?: boolean }) {
  return (
    <div className="flex justify-between py-2">
      <dt className={strong ? "font-medium text-content" : "text-muted"}>{label}</dt>
      <dd>
        <Money minor={minor} emphasis={strong} className="text-content" />
      </dd>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-sm p-12 text-center">
      <Wallet className="mx-auto size-8 text-faint" aria-hidden />
      <p className="mt-3 font-display text-base font-semibold text-content">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
