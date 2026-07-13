"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton, EmptyState } from "./Misc";
import { IconName } from "@/components/icons";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  empty?: { icon?: IconName; title: string; description?: string; action?: React.ReactNode };
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  onRowClick,
  empty,
}: DataTableProps<T>) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-faint",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-line/60">
                  {columns.map((c) => (
                    <td key={c.key} className="px-5 py-4">
                      <Skeleton className="h-4 w-[70%]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={empty?.icon}
                    title={empty?.title ?? "Nothing here yet"}
                    description={empty?.description}
                    action={empty?.action}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.025, 0.3), duration: 0.3 }}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-line/60 transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-surface-2/70",
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-5 py-3.5 text-content", c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
