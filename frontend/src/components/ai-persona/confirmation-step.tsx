"use client";

import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PersonaSourceSet } from "@/types/persona-import.types";

export function ConfirmationStep({ set, onStartOver }: { set: PersonaSourceSet | null; onStartOver: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-6 py-12 text-center">
      <CheckCircle2 className="h-8 w-8 text-success" />
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          {set?.selectedCount ?? 0} emails saved as training source for this account&apos;s AI Persona
        </h2>
        <p className="text-small text-muted-foreground">
          This selection is saved as a versioned source set — training on it happens next, separate from this import
          step.
        </p>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={onStartOver}>
        Start a new import
      </Button>
    </div>
  );
}
