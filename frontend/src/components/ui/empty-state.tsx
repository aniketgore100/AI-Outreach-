"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border border-dashed border-border px-6 py-12 text-center",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-h3 text-foreground">{title}</h3>
      <p className="max-w-sm text-small text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </motion.div>
  );
}
