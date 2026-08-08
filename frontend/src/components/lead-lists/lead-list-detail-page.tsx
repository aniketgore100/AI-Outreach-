"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RotateCw,
  Search,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadDetailDialog } from "@/components/lead-lists/lead-detail-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getAvatarColors, getInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearSelectedLead,
  fetchLead,
  fetchLeadList,
  fetchLeads,
} from "@/store/slices/lead-list.slice";

const PAGE_SIZE = 10;
type LeadSortKey = "firstName" | "companyName" | "jobTitle" | "location";
type SortDirection = "asc" | "desc";

export function LeadListDetailPage() {
  const params = useParams<{ id: string }>();
  const leadListId = params.id;
  const dispatch = useAppDispatch();
  const {
    current,
    currentStatus,
    leads,
    leadsPagination,
    leadsStatus,
    leadsError,
    selectedLead,
  } = useAppSelector((state) => state.leadLists);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedCompany = useDebouncedValue(companyFilter, 350);
  const debouncedJobTitle = useDebouncedValue(jobTitleFilter, 350);
  const debouncedLocation = useDebouncedValue(locationFilter, 350);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<LeadSortKey>("firstName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    void dispatch(fetchLeadList(leadListId));
  }, [dispatch, leadListId]);

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      companyName: debouncedCompany || undefined,
      jobTitle: debouncedJobTitle || undefined,
      location: debouncedLocation || undefined,
    }),
    [
      page,
      debouncedSearch,
      debouncedCompany,
      debouncedJobTitle,
      debouncedLocation,
    ],
  );

  useEffect(() => {
    void dispatch(fetchLeads({ leadListId, query }));
  }, [dispatch, leadListId, query]);

  useEffect(() => {
    if (selectedLeadId) {
      void dispatch(fetchLead({ leadListId, leadId: selectedLeadId }));
    }
  }, [dispatch, leadListId, selectedLeadId]);

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      const result =
        sortKey === "firstName"
          ? `${a.firstName} ${a.lastName}`.localeCompare(
              `${b.firstName} ${b.lastName}`,
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              },
            )
          : (a[sortKey] || "").localeCompare(b[sortKey] || "", undefined, {
              numeric: true,
              sensitivity: "base",
            });
      return sortDirection === "asc" ? result : -result;
    });
  }, [leads, sortKey, sortDirection]);

  const handleSortChange = (key: LeadSortKey) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleFilterChange =
    (setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      setPage(1);
    };

  const handleRetry = () => void dispatch(fetchLeads({ leadListId, query }));

  const skippedCount = current
    ? current.skippedDuplicateCount + current.skippedMissingEmailCount
    : 0;
  const hasActiveFilters = Boolean(
    search || companyFilter || jobTitleFilter || locationFilter,
  );

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lead List
        </Link>

        {currentStatus === "loading" && !current ? (
          <Skeleton className="h-7 w-64" />
        ) : currentStatus === "failed" ? (
          <div className="flex items-center gap-1.5 text-sm text-destructive">
            <CircleAlert className="h-4 w-4 shrink-0" />
            Could not load this lead list.
          </div>
        ) : (
          <>
            <h1 className="text-h1 text-foreground">
              {current?.name ?? "Lead list"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {(current?.leadCount ?? 0).toLocaleString()} leads
              {skippedCount > 0
                ? ` · ${skippedCount.toLocaleString()} rows skipped during import`
                : ""}
            </p>
          </>
        )}
      </motion.div>

      <motion.div
        className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.04 }}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={handleFilterChange(setSearch)}
              placeholder="Search name, email, company"
              className="h-8 w-56 pl-8 text-sm"
            />
          </div>
          <Input
            value={companyFilter}
            onChange={handleFilterChange(setCompanyFilter)}
            placeholder="Company"
            className="h-8 w-36 text-sm"
          />
          <Input
            value={jobTitleFilter}
            onChange={handleFilterChange(setJobTitleFilter)}
            placeholder="Job title"
            className="h-8 w-36 text-sm"
          />
          <Input
            value={locationFilter}
            onChange={handleFilterChange(setLocationFilter)}
            placeholder="Location"
            className="h-8 w-36 text-sm"
          />
        </div>

        {leadsStatus === "failed" ? (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-destructive/5 px-4 py-3 text-small text-destructive">
            <span className="flex items-center gap-1.5">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              {leadsError ?? "Could not load leads."}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRetry}
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : null}

        {leadsStatus === "loading" && leads.length === 0 ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Users}
              title={
                hasActiveFilters
                  ? "No leads match your filters"
                  : "No leads in this list"
              }
              description={
                hasActiveFilters
                  ? "Try a different name, email, company, job title, or location."
                  : "This list doesn't have any leads yet."
              }
            />
          </div>
        ) : (
          <>
            <Table containerClassName="border-0 rounded-none">
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Name"
                    sortKey="firstName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <TableHead>Email</TableHead>
                  <SortableTableHead
                    label="Company"
                    sortKey="companyName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <SortableTableHead
                    label="Job title"
                    sortKey="jobTitle"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <SortableTableHead
                    label="Location"
                    sortKey="location"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeads.map((lead) => {
                  const avatarColors = getAvatarColors(lead.id);
                  return (
                    <TableRow
                      key={lead.id}
                      clickable
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback
                              className={cn(avatarColors.bg, avatarColors.text)}
                            >
                              {getInitials(lead.firstName, lead.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">
                            {[lead.firstName, lead.lastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.companyName || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.jobTitle || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.location || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {leadsPagination && leadsPagination.totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-small text-muted-foreground">
                <span>
                  Page {leadsPagination.page} of {leadsPagination.totalPages} ·{" "}
                  {leadsPagination.total.toLocaleString()} leads
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
                    disabled={page >= leadsPagination.totalPages}
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

      <LeadDetailDialog
        lead={selectedLead}
        open={Boolean(selectedLeadId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLeadId(null);
            dispatch(clearSelectedLead());
          }
        }}
      />
    </div>
  );
}
