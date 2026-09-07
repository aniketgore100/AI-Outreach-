"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Megaphone, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMinLoadingDuration } from "@/hooks/use-min-loading-duration";
import { getNameInitials } from "@/lib/avatar";
import { formatDate } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCampaigns } from "@/store/slices/campaign.slice";
import type { CampaignStatus } from "@/types/campaign.types";

const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ value: CampaignStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready to launch" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function CampaignsListPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, pagination, status, error } = useAppSelector((state) => state.campaigns);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [page, debouncedSearch, statusFilter]
  );

  useEffect(() => {
    void dispatch(fetchCampaigns(query));
  }, [dispatch, query]);

  useEffect(() => {
    if (status === "failed" && error) {
      toast.error(error);
    }
  }, [status, error]);

  const hasActiveFilters = Boolean(search) || statusFilter !== "all";
  const isInitialLoad = useMinLoadingDuration(status === "loading" && items.length === 0);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:max-w-2xl">
          <div className="relative w-full min-w-0 flex-1 sm:max-w-[18rem]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search campaigns"
              className="h-8 w-full pl-8 text-sm"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as CampaignStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-full sm:w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" className="shrink-0 gap-2 sm:self-auto" asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      <motion.div
        className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.03 }}
      >
        {isInitialLoad ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Megaphone}
              title={hasActiveFilters ? "No campaigns match your filters" : "No campaigns yet"}
              description={
                hasActiveFilters
                  ? "Try a different name or status."
                  : "Build a multi-step outreach sequence and start reaching leads."
              }
              action={
                !hasActiveFilters ? (
                  <Button type="button" asChild>
                    <Link href="/dashboard/campaigns/new">
                      <Plus className="h-4 w-4" />
                      Create your first campaign
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
                <TableRow className="h-9 divide-x divide-border/70 bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Time Zone</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((campaign) => {
                  return (
                    <TableRow
                      key={campaign.id}
                      clickable
                      className="group h-9 divide-x divide-border/70"
                      onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                    >
                      <TableCell className="text-[12px]">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700/70">
                              {getNameInitials(campaign.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="block max-w-45 truncate font-medium text-foreground">{campaign.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CampaignStatusBadge status={campaign.status} className="text-[11px]" />
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {campaign.startTime && campaign.endTime ? `${campaign.startTime} – ${campaign.endTime}` : "—"}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{campaign.timeZone ?? "—"}</TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{formatDate(campaign.updatedAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {pagination && pagination.totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-small text-muted-foreground">
                <span>
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} campaigns
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
    </div>
  );
}
