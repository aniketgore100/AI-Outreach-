"use client";

import { ArrowDown, ArrowUp, ChevronDown, type LucideIcon } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps<TKey extends string> {
  label: string;
  icon?: LucideIcon;
  sortKey: TKey;
  activeKey: TKey;
  direction: "asc" | "desc";
  onSortChange: (key: TKey) => void;
  className?: string;
}

export function SortableTableHead<TKey extends string>({
  label,
  icon: Icon,
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
          "inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
          isActive && "text-foreground"
        )}
      >
        {Icon ? <Icon className="h-3 w-3 shrink-0" /> : null}
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}
