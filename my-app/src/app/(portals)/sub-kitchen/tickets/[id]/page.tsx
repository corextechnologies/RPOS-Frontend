"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrepTicketDetail } from "@/components/branch/sub-kitchen/PrepTicketDetail";

export default function SubKitchenTicketPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <Link
        href="/sub-kitchen"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the board
      </Link>
      <PrepTicketDetail id={params.id} />
    </div>
  );
}
