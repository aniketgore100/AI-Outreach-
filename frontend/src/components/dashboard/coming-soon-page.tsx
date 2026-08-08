import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface ComingSoonPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoonPage({
  icon,
  title,
  description,
}: ComingSoonPageProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <Badge variant="neutral">Coming soon</Badge>
      </div>

      <div className="rounded-xl border border-border/70 bg-card px-6 py-16 shadow-sm">
        <EmptyState
          icon={icon}
          title={`${title} is on the way`}
          description={description}
        />
      </div>
    </div>
  );
}
