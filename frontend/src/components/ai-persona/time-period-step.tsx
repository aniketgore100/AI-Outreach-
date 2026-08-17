"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { PersonaTimePeriodPreset, StartImportPayload } from "@/types/persona-import.types";

const PRESETS: Array<{ value: PersonaTimePeriodPreset; label: string; hint: string }> = [
  { value: "3m", label: "Last 3 months", hint: "Fastest, smallest set" },
  { value: "6m", label: "Last 6 months", hint: "Recommended — recent voice, good volume" },
  { value: "12m", label: "Last 12 months", hint: "Wider history" },
  { value: "all", label: "All time", hint: "Everything in Sent" },
  { value: "custom", label: "Custom range", hint: "Pick exact dates" },
];

export function TimePeriodStep({
  onStart,
  isSubmitting,
  error,
}: {
  onStart: (payload: StartImportPayload) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const [preset, setPreset] = useState<PersonaTimePeriodPreset>("6m");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const canSubmit = preset !== "custom" || Boolean(from && to);

  const handleSubmit = () => {
    if (preset === "custom") {
      onStart({ timePeriod: { preset, from: new Date(from).toISOString(), to: new Date(to).toISOString() } });
      return;
    }
    onStart({ timePeriod: { preset } });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">Choose a time period</h2>
        <p className="text-small text-muted-foreground">
          We&apos;ll pull sent mail from this window, then filter it down to candidates you can review.
        </p>
      </div>

      <div className="grid gap-2">
        {PRESETS.map((option) => {
          const active = preset === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreset(option.value)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                active
                  ? "border-primary/30 bg-primary/5 text-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-caption text-muted-foreground">{option.hint}</span>
            </button>
          );
        })}
      </div>

      {preset === "custom" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9" />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="flex items-center gap-1.5 text-small text-destructive">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" className="gap-1.5" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? <Spinner size="sm" /> : null}
          Fetch sent emails
        </Button>
      </div>
    </div>
  );
}
