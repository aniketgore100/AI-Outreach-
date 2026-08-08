"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, MoreHorizontal, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteLeadListDialog } from "@/components/lead-lists/delete-lead-list-dialog";
import { formatDate } from "@/lib/format";
import { useAppDispatch } from "@/store/hooks";
import { deleteLeadList } from "@/store/slices/lead-list.slice";
import type { LeadListSummary } from "@/types/lead-list.types";

export type LeadListSortKey = "fileName" | "leadCount" | "createdAt";
export type SortDirection = "asc" | "desc";

interface LeadListsTableProps {
  items: LeadListSummary[];
  sortKey: LeadListSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: LeadListSortKey) => void;
}

export function LeadListsTable({ items, sortKey, sortDirection, onSortChange }: LeadListsTableProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<LeadListSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!pendingDelete) return;

    setIsDeleting(true);
    await dispatch(deleteLeadList(pendingDelete.id));
    setIsDeleting(false);
    setPendingDelete(null);
  };

  return (
    <>
      <Table containerClassName="border-0 rounded-none">
        <TableHeader>
          <TableRow className="h-10 bg-muted/50">
            <SortableTableHead
              label="File Name"
              sortKey="fileName"
              activeKey={sortKey}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Leads"
              sortKey="leadCount"
              activeKey={sortKey}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <SortableTableHead
              label="Uploaded"
              sortKey="createdAt"
              activeKey={sortKey}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <TableHead className="sticky right-0 z-10 w-12 bg-muted pr-4 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((leadList) => (
            <TableRow
              key={leadList.id}
              clickable
              className="group h-12"
              onClick={() => router.push(`/dashboard/lead-lists/${leadList.id}`)}
            >
              <TableCell>
                <Link
                  href={`/dashboard/lead-lists/${leadList.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="max-w-72 truncate">{leadList.uploadMetadata.originalFileName}</span>
                </Link>
              </TableCell>
              <TableCell className="tabular-nums text-foreground">{leadList.leadCount.toLocaleString()}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(leadList.createdAt)}</TableCell>
              <TableCell
                className="sticky right-0 z-10 w-12 bg-card pr-4 text-right transition-colors group-hover:bg-accent"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Actions for ${leadList.uploadMetadata.originalFileName}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground shadow-sm transition-all duration-150 hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-80 min-w-44" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/lead-lists/${leadList.id}`}>View leads</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => setPendingDelete(leadList)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DeleteLeadListDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        leadListName={pendingDelete?.uploadMetadata.originalFileName ?? ""}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
