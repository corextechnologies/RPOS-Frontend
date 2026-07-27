"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, ExternalLink, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useMyRestaurant } from "@/lib/hooks/use-admin-restaurant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";

export default function AdminQrPage() {
  const restaurant = useMyRestaurant();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Lazy init: resolves to the real origin on the client's first render, "" on
  // the server. No effect needed, so no cascading-render lint error.
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );

  if (restaurant.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (restaurant.isError || !restaurant.data) {
    return (
      <ErrorState title="Could not load your restaurant" onRetry={() => restaurant.refetch()} />
    );
  }

  const slug = restaurant.data.public_slug;
  const name = restaurant.data.name;

  if (!slug) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeading />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            Your restaurant doesn&apos;t have a public menu link yet. It&apos;s assigned when your
            restaurant is set up — contact your operator if this persists.
          </CardContent>
        </Card>
      </div>
    );
  }

  const publicUrl = origin ? `${origin}/m/${slug}` : `/m/${slug}`;

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${slug}-menu-qr.png`;
    link.click();
  };

  const printQr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) {
      toast.error("Allow pop-ups to print the QR code");
      return;
    }
    win.document.write(
      `<html><head><title>${name} — Menu QR</title></head>` +
        `<body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;gap:16px">` +
        `<h2 style="margin:0">${name}</h2>` +
        `<img src="${dataUrl}" style="width:320px;height:320px" alt="Menu QR" />` +
        `<p style="margin:0;color:#666">Scan for our live menu</p>` +
        `</body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeading />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live menu QR code</CardTitle>
          <CardDescription>
            Print this code for tables and counters. Scanning it opens your current published menu
            — no app or login needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="rounded-2xl bg-white p-5 shadow-soft">
            <QRCodeCanvas ref={canvasRef} value={publicUrl} size={220} marginSize={1} level="M" />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={downloadPng}>
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button variant="outline" onClick={printQr}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Preview menu
              </a>
            </Button>
          </div>

          <div className="w-full space-y-2">
            <p className="text-xs font-medium text-muted">Public menu link</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-content">
                {publicUrl}
              </code>
              <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-faint">
            Diners see the latest published menu. Update it under{" "}
            <Link href="/admin/menu" className="text-brand hover:underline">
              Menu
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeading() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
        <QrCode className="h-5 w-5" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">QR Menu</h1>
        <p className="text-sm text-muted">A scannable code for your live menu.</p>
      </div>
    </div>
  );
}
