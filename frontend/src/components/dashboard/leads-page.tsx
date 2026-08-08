"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CircleAlert, RotateCw, Search, Users } from "lucide-react";

import { LeadListUploader } from "@/components/lead-lists/lead-list-uploader";
import { LeadListsTable, type LeadListSortKey, type SortDirection } from "@/components/lead-lists/lead-lists-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLeadLists } from "@/store/slices/lead-list.slice";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 350;

export function LeadsPage() {
  const dispatch = useAppDispatch();
  const { items, pagination, status, error } = useAppSelector((state) => state.leadLists);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<LeadListSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const isSearchActive = debouncedSearch.length > 0;

  // Tracks the previously-fetched search term so a search change can reset
  // to page 1 without firing a duplicate request for the stale page.
  const prevSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== debouncedSearch;
    prevSearchRef.current = debouncedSearch;

    if (searchChanged && page !== 1) {
      setPage(1);
      return;
    }

    void dispatch(fetchLeadLists({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined }));
  }, [dispatch, page, debouncedSearch]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let result = 0;
      if (sortKey === "fileName") {
        result = a.uploadMetadata.originalFileName.localeCompare(b.uploadMetadata.originalFileName);
      } else if (sortKey === "leadCount") {
        result = a.leadCount - b.leadCount;
      } else {
        result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDirection === "asc" ? result : -result;
    });
  }, [items, sortKey, sortDirection]);

  const handleSortChange = (key: LeadListSortKey) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "fileName" ? "asc" : "desc");
    }
  };

  const handleRetry = () =>
    void dispatch(fetchLeadLists({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined }));

  // While a search is active, an empty result set just means no matches —
  // the toolbar (and its search box) must stay visible so it can be cleared.
  // With no search active, an empty result set means the account truly has
  // no lead lists yet, so the toolbar is hidden in favor of the empty state.
  const showToolbar = isSearchActive || items.length > 0;
  const isInitialLoading = status === "loading" && items.length === 0;

  return (
    <div className="w-full space-y-4">
      <motion.div
        className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.05 }}
      >
        <div className="flex flex-col gap-4 border-b border-border/70 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lead Lists</p>
            <h1 className="text-h1 text-foreground">Imported Lead Lists</h1>
            <p className="max-w-2xl text-small text-muted-foreground">
              Review, open, or remove uploaded lists from one place.
            </p>
          </div>
          <LeadListUploader />
        </div>

        <AnimatePresence initial={false} mode="wait">
          {status === "failed" ? (
            <motion.div
              key="lead-lists-error"
              className="flex items-center justify-between gap-3 border-b border-border bg-destructive/5 px-4 py-3 text-small text-destructive"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
              <span className="flex items-center gap-1.5">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                {error ?? "Could not load lead lists."}
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={handleRetry}>
                <RotateCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {showToolbar ? (
          <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by file name"
                maxLength={200}
                className="h-8 w-full pl-8 text-sm"
              />
            </div>
            {pagination ? (
              <p className="text-small text-muted-foreground">
                {pagination.total.toLocaleString()} {pagination.total === 1 ? "list" : "lists"}
              </p>
            ) : null}
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          {isInitialLoading ? (
            <motion.div
              key="lead-lists-loading"
              className="space-y-2 px-4 py-4"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-md" />
              ))}
            </motion.div>
          ) : items.length === 0 && !isSearchActive ? (
            <motion.div
              key="lead-lists-empty"
              className="px-5 py-6"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
              <EmptyState
                icon={Users}
                title="No lead lists yet"
                description="Upload a CSV or XLSX file to import your first list of leads."
              />
            </motion.div>
          ) : items.length === 0 && isSearchActive ? (
            <motion.div
              key="lead-lists-filter-empty"
              className="px-5 py-6"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
              <EmptyState
                icon={Search}
                title="No lists match your search"
                description={`No file names matched "${debouncedSearch}". Try a different search term.`}
              />
            </motion.div>
          ) : (
            <motion.div
              key="lead-lists-table"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <LeadListsTable
                items={sortedItems}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-small text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span className="tabular-nums">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} lists
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
      </motion.div>
    </div>
  );
}
