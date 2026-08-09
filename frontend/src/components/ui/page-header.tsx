import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** "default" for top-level pages (Campaigns, Templates, ...); "compact"
   * for drill-down/detail pages nested under a list, where a full text-h1
   * title reads as too tall relative to how little vertical space the
   * back-link + title + description block should take. */
  size?: "default" | "compact";
}

export function PageHeader({ title, description, actions, className, size = "default" }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="space-y-0.5">
        <h1 className={cn(size === "compact" ? "text-h3" : "text-h1", "text-foreground")}>{title}</h1>
        {description ? <p className="text-small text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
