"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteTemplateDialog } from "@/components/templates/delete-template-dialog";
import { RenameTemplateDialog } from "@/components/templates/rename-template-dialog";
import { TemplateStatusBadge } from "@/components/templates/template-status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getAvatarColors, getNameInitials } from "@/lib/avatar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteTemplate,
  duplicateTemplate,
  fetchTemplates,
  updateTemplate,
} from "@/store/slices/template.slice";
import type { EmailTemplate, TemplateStatus } from "@/types/template.types";

const PAGE_SIZE = 20;

export function TemplatesListPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, pagination, status } = useAppSelector(
    (state) => state.templates,
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "all">(
    "all",
  );
  const [page, setPage] = useState(1);

  const [pendingDelete, setPendingDelete] = useState<EmailTemplate | null>(
    null,
  );
  const [pendingRename, setPendingRename] = useState<EmailTemplate | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [page, debouncedSearch, statusFilter],
  );

  useEffect(() => {
    void dispatch(fetchTemplates(query));
  }, [dispatch, query]);

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    const result = await dispatch(duplicateTemplate(id));
    setDuplicatingId(null);

    if (duplicateTemplate.fulfilled.match(result)) {
      router.push(`/dashboard/templates/${result.payload.id}`);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    await dispatch(deleteTemplate(pendingDelete.id));
    setIsDeleting(false);
    setPendingDelete(null);
  };

  const handleRename = async (name: string) => {
    if (!pendingRename) return;
    setIsRenaming(true);
    await dispatch(updateTemplate({ id: pendingRename.id, payload: { name } }));
    setIsRenaming(false);
    setPendingRename(null);
  };

  const hasActiveFilters = Boolean(search) || statusFilter !== "all";
  const isInitialLoad = status === "loading" && items.length === 0;

  return (
    <div className="w-full space-y-6">
      <motion.div
        className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.03 }}
      >
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-wrap items-center gap-2 md:max-w-2xl">
            <div className="relative w-full min-w-0 flex-1 md:max-w-[18rem]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search templates"
                className="h-8 w-full pl-8 text-sm"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as TemplateStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full md:w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" className="shrink-0 gap-2 md:self-end" asChild>
            <Link href="/dashboard/templates/new">
              <Plus className="h-4 w-4" />
              New Template
            </Link>
          </Button>
        </div>

        {isInitialLoad ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FileText}
              title={
                hasActiveFilters
                  ? "No templates match your filters"
                  : "No templates yet"
              }
              description={
                hasActiveFilters
                  ? "Try a different name or status."
                  : "Create a reusable email template with personalization variables to speed up your outreach."
              }
              action={
                !hasActiveFilters ? (
                  <Button type="button" asChild>
                    <Link href="/dashboard/templates/new">
                      <Plus className="h-4 w-4" />
                      Create your first template
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <Table containerClassName="border-0 rounded-none">
              <TableHeader>
                <TableRow className="h-10 bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="sticky right-0 z-10 w-12 bg-muted pr-4 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((template) => {
                  const avatarColors = getAvatarColors(template.id);
                  return (
                    <TableRow
                      key={template.id}
                      clickable
                      className="group h-12"
                      onClick={() =>
                        router.push(`/dashboard/templates/${template.id}`)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback
                              className={cn(avatarColors.bg, avatarColors.text)}
                            >
                              {getNameInitials(template.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="block max-w-96 truncate font-medium text-foreground">
                              {template.name}
                            </span>
                            {template.subject ? (
                              <span className="mt-0.5 block max-w-96 truncate text-small text-muted-foreground">
                                {template.subject}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TemplateStatusBadge status={template.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(template.updatedAt)}
                      </TableCell>
                      <TableCell
                        className="sticky right-0 z-10 w-12 bg-card pr-4 text-right transition-colors group-hover:bg-accent"
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Actions for ${template.name}`}
                              disabled={duplicatingId === template.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground shadow-sm transition-all duration-150 hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="z-80 min-w-44">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/dashboard/templates/${template.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setPendingRename(template)}
                            >
                              <FileText className="h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void handleDuplicate(template.id)}
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              destructive
                              onSelect={() => setPendingDelete(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {pagination && pagination.totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-small text-muted-foreground">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ·{" "}
                  {pagination.total.toLocaleString()} templates
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </motion.div>

      <DeleteTemplateDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        templateName={pendingDelete?.name ?? ""}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />

      <RenameTemplateDialog
        open={Boolean(pendingRename)}
        onOpenChange={(open) => !open && setPendingRename(null)}
        currentName={pendingRename?.name ?? ""}
        isSaving={isRenaming}
        onConfirm={handleRename}
      />
    </div>
  );
}
