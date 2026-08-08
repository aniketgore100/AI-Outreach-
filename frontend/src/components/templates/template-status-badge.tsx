import { CircleCheck, PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { TemplateStatus } from "@/types/template.types";

const STATUS_CONFIG: Record<TemplateStatus, { label: string; variant: "neutral" | "success"; icon: typeof PenLine }> = {
  draft: { label: "Draft", variant: "neutral", icon: PenLine },
  active: { label: "Active", variant: "success", icon: CircleCheck },
};

export function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  const { label, variant, icon: Icon } = STATUS_CONFIG[status];

  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
