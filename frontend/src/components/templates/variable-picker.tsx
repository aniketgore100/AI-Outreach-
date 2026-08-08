"use client";

import { useState } from "react";
import { Braces } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PERSONALIZATION_VARIABLES } from "@/lib/template-render";

interface VariablePickerProps {
  onInsert: (token: string) => void;
}

/** Lists every supported `{{variable}}` with its sample value, so the user
 * always knows exactly what's available and what it'll look like. */
export function VariablePicker({ onInsert }: VariablePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 shrink-0 gap-1 whitespace-nowrap rounded-md border-transparent bg-accent px-2 text-caption font-medium text-accent-foreground shadow-none hover:bg-accent/70"
        >
          <Braces className="h-2 w-2 shrink-0" />
          Insert Variable
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-2"
        // We move focus back into the editor/subject field ourselves
        // (onInsert) the instant a variable is picked. Radix's default
        // close behavior re-focuses the trigger button shortly after —
        // later than our own focus call — which would silently steal
        // focus back and swallow whatever the user types next.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <p className="px-1.5 pb-2 pt-1 text-caption uppercase tracking-wide text-muted-foreground">
          Personalization variables
        </p>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {PERSONALIZATION_VARIABLES.map((variable) => (
            <button
              key={variable.field}
              type="button"
              onClick={() => {
                onInsert(variable.token);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-sm px-1.5 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{variable.label}</span>
                <span className="block truncate text-small text-muted-foreground">{variable.sample}</span>
              </span>
              <code className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-caption text-muted-foreground">
                {variable.token}
              </code>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
