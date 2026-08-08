"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps<TKey extends string> {
  label: string;
  sortKey: TKey;
  activeKey: TKey;
  direction: "asc" | "desc";
  onSortChange: (key: TKey) => void;
  className?: string;
}

export function SortableTableHead<TKey extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSortChange,
  className,
}: SortableTableHeadProps<TKey>) {
  const isActive = activeKey === sortKey;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground",
          isActive && "text-foreground"
        )}
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
