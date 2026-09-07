import { CircleCheck, PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TemplateStatus } from "@/types/template.types";

const STATUS_CONFIG: Record<TemplateStatus, { label: string; variant: "neutral" | "success"; icon: typeof PenLine }> = {
  draft: { label: "Draft", variant: "neutral", icon: PenLine },
  active: { label: "Active", variant: "success", icon: CircleCheck },
};

export function TemplateStatusBadge({ status, className }: { status: TemplateStatus; className?: string }) {
  const { label, variant, icon: Icon } = STATUS_CONFIG[status];

  return (
    <Badge variant={variant} className={cn("h-6 rounded-md px-2", className)}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}
