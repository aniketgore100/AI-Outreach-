"use client";

import { Check, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/format";
import type { PersonaFilterReason, PersonaSourceEmail } from "@/types/persona-import.types";

const FILTER_LABELS: Record<Exclude<PersonaFilterReason, null>, string> = {
  internal_recipient: "Internal recipient",
  auto_generated: "Likely auto-generated",
  too_short: "Very short",
  too_long: "Very long",
};

const LOW_SELECTION_THRESHOLD = 10;

export function CandidateListStep({
  candidates,
  total,
  isLoading,
  selectedCount,
  onToggle,
  onIncludeAll,
  onConfirm,
  isConfirming,
  error,
}: {
  candidates: PersonaSourceEmail[];
  total: number;
  isLoading: boolean;
  selectedCount: number;
  onToggle: (id: string, included: boolean) => void;
  onIncludeAll: (included: boolean) => void;
  onConfirm: () => void;
  isConfirming: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <EmptyState
        icon={CircleAlert}
        title="No candidate emails found"
        description="Nothing in this time window survived the baseline filters. Try a wider period."
      />
    );
  }

  const allIncluded = candidates.every((candidate) => candidate.included);
  const someIncluded = candidates.some((candidate) => candidate.included);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allIncluded}
            indeterminate={!allIncluded && someIncluded}
            onCheckedChange={onIncludeAll}
            aria-label="Include all shown"
          />
          <span className="text-small text-muted-foreground">Include all shown</span>
        </div>
        <span className="text-small font-medium text-foreground">{selectedCount} selected</span>
      </div>

      {total > candidates.length ? (
        <p className="text-caption text-muted-foreground">
          Showing the first {candidates.length} of {total} candidates. Narrow the time period to see fewer, more
          relevant ones.
        </p>
      ) : null}

      {selectedCount > 0 && selectedCount < LOW_SELECTION_THRESHOLD ? (
        <p className="rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-small text-warning">
          More examples generally produce a stronger persona — consider selecting more than {LOW_SELECTION_THRESHOLD}.
        </p>
      ) : null}

      <ul className="divide-y divide-border/60 rounded-md border border-border/70">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex items-start gap-3 px-3 py-3">
            <div className="pt-0.5">
              <Checkbox
                checked={candidate.included}
                onCheckedChange={(checked) => onToggle(candidate.id, checked)}
                aria-label={`Include "${candidate.subject || "no subject"}"`}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-sm font-medium text-foreground">{candidate.subject || "(no subject)"}</p>
                <span className="shrink-0 text-caption text-muted-foreground">{formatDate(candidate.sentAt)}</span>
              </div>
              <p className="truncate text-caption text-muted-foreground">To: {candidate.recipientDomain}</p>
              {candidate.snippet ? (
                <p className="line-clamp-2 text-small text-muted-foreground">{candidate.snippet}</p>
              ) : null}
              {candidate.duplicateCount > 1 || candidate.filterReason ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {candidate.duplicateCount > 1 ? (
                    <Badge variant="info">Sent to {candidate.duplicateCount} recipients</Badge>
                  ) : null}
                  {candidate.filterReason ? <Badge variant="warning">{FILTER_LABELS[candidate.filterReason]}</Badge> : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="flex items-center gap-1.5 text-small text-destructive">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" className="gap-1.5" disabled={selectedCount === 0 || isConfirming} onClick={onConfirm}>
          {isConfirming ? <Spinner size="sm" /> : <Check className="h-3.5 w-3.5" />}
          Confirm selection
        </Button>
      </div>
    </div>
  );
}
