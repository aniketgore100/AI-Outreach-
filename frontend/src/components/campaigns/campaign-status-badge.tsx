import { Archive, CheckCircle2, CircleCheck, PauseCircle, Rocket } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/types/campaign.types";

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]>; icon: React.ComponentType<{ className?: string }> | null }
> = {
  draft: { label: "Draft", variant: "neutral", icon: null },
  ready: { label: "Ready", variant: "info", icon: CheckCircle2 },
  active: { label: "Active", variant: "success", icon: Rocket },
  paused: { label: "Paused", variant: "warning", icon: PauseCircle },
  completed: { label: "Completed", variant: "success", icon: CircleCheck },
  archived: { label: "Archived", variant: "neutral", icon: Archive },
};

export function CampaignStatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  const { label, variant, icon: Icon } = STATUS_CONFIG[status];

  return (
    <Badge variant={variant} className={cn("h-5 gap-1 rounded-md px-1.5", className)}>
      {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
      {label}
    </Badge>
  );
}
