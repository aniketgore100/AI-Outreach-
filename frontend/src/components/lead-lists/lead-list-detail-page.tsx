"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Globe,
  Mail,
  MapPin,
  RotateCw,
  Search,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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
import { useMinLoadingDuration } from "@/hooks/use-min-loading-duration";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearSelectedLead,
  fetchLead,
  fetchLeadList,
  fetchLeads,
} from "@/store/slices/lead-list.slice";

const PAGE_SIZE = 10;
type LeadSortKey = "firstName" | "lastName" | "email" | "companyName" | "jobTitle" | "location";
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
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const isHeaderLoading = useMinLoadingDuration(currentStatus === "loading" && !current);
  const isLeadsLoading = useMinLoadingDuration(leadsStatus === "loading" && leads.length === 0);
  const isSelectedLeadLoading = useMinLoadingDuration(Boolean(selectedLeadId) && !selectedLead);

  // Row selection is page-scoped — reset it whenever the visible page of
  // leads changes so a stale checkmark can't linger from a previous page.
  // Done during render (React's "adjusting state" pattern) rather than in
  // an effect, so it can't show a stale selection for a frame first.
  const [prevLeads, setPrevLeads] = useState(leads);
  if (leads !== prevLeads) {
    setPrevLeads(leads);
    setCheckedIds(new Set());
  }

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
      const result = (a[sortKey] || "").localeCompare(b[sortKey] || "", undefined, {
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

  const allOnPageChecked = sortedLeads.length > 0 && sortedLeads.every((lead) => checkedIds.has(lead.id));
  const someOnPageChecked = !allOnPageChecked && sortedLeads.some((lead) => checkedIds.has(lead.id));

  const toggleCheckAll = () => {
    setCheckedIds(allOnPageChecked ? new Set() : new Set(sortedLeads.map((lead) => lead.id)));
  };

  const toggleCheckOne = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Link
          href="/dashboard"
          className="mb-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lead List
        </Link>

        {isHeaderLoading ? (
          <Skeleton className="h-5 w-48" />
        ) : currentStatus === "failed" ? (
          <div className="flex items-center gap-1.5 text-sm text-destructive">
            <CircleAlert className="h-4 w-4 shrink-0" />
            Could not load this lead list.
          </div>
        ) : (
          <PageHeader
            size="compact"
            title={current?.name ?? "Lead list"}
            description={`${(current?.leadCount ?? 0).toLocaleString()} leads${
              skippedCount > 0 ? ` · ${skippedCount.toLocaleString()} rows skipped during import` : ""
            }`}
          />
        )}
      </motion.div>

      <motion.div
        className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm"
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

        {isLeadsLoading ? (
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
                <TableRow className="divide-x divide-border/70">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageChecked}
                      indeterminate={someOnPageChecked}
                      onCheckedChange={toggleCheckAll}
                      aria-label="Select all leads on this page"
                    />
                  </TableHead>
                  <SortableTableHead
                    label="First Name"
                    icon={User}
                    sortKey="firstName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <SortableTableHead
                    label="Last Name"
                    icon={User}
                    sortKey="lastName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <SortableTableHead
                    label="Email"
                    icon={Mail}
                    sortKey="email"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <SortableTableHead
                    label="Job Title"
                    icon={Briefcase}
                    sortKey="jobTitle"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <SortableTableHead
                    label="Company"
                    icon={Building2}
                    sortKey="companyName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <SortableTableHead
                    label="Location"
                    icon={MapPin}
                    sortKey="location"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSortChange={handleSortChange}
                  />
                  <TableHead>
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="h-3 w-3 shrink-0" />
                      Website
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeads.map((lead, index) => {
                  const isChecked = checkedIds.has(lead.id);
                  return (
                    <TableRow
                      key={lead.id}
                      clickable
                      className="group divide-x divide-border/70"
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <TableCell
                        className="w-10"
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <span
                          className={cn(
                            "tabular-nums text-muted-foreground",
                            checkedIds.size > 0 ? "hidden" : "group-hover:hidden"
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className={cn(checkedIds.size > 0 ? "flex" : "hidden group-hover:flex")}>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleCheckOne(lead.id)}
                            aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                          />
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {lead.firstName || "—"}
                      </TableCell>
                      <TableCell className="text-foreground">{lead.lastName || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.jobTitle || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.companyName || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.location || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="truncate text-primary hover:underline"
                          >
                            {lead.website}
                          </a>
                        ) : (
                          "—"
                        )}
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
        loading={isSelectedLeadLoading}
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
