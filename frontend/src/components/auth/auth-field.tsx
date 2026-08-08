import { CircleAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AuthField({
  id,
  label,
  icon: Icon,
  error,
  help,
  trailing,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: React.ElementType;
  error?: string;
  help?: string;
  trailing?: React.ReactNode;
}) {
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div>
      <Label htmlFor={id} className="text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "h-12 rounded-xl border-input bg-background/40 pl-10 text-sm placeholder:text-muted-foreground/60",
            trailing && "pr-11",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          {...props}
        />
        {trailing ? <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</span> : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 flex items-center gap-1.5 text-small text-destructive">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="mt-2 text-small text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}
