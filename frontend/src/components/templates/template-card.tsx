"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock,
  Copy,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateStatusBadge } from "@/components/templates/template-status-badge";
import { getAvatarColors, getNameInitials } from "@/lib/avatar";
import { formatDate, stripHtml } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/types/template.types";

interface TemplateCardProps {
  template: EmailTemplate;
  isDuplicating: boolean;
  onRename: (template: EmailTemplate) => void;
  onDuplicate: (id: string) => void;
  onDelete: (template: EmailTemplate) => void;
}

export function TemplateCard({
  template,
  isDuplicating,
  onRename,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const router = useRouter();
  const href = `/dashboard/templates/${template.id}`;
  const avatarColors = getAvatarColors(template.id);
  const preview = stripHtml(template.bodyHtml);

  return (
    <motion.div
      className="group flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-border hover:bg-accent/30"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      onClick={() => router.push(href)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className={cn(avatarColors.bg, avatarColors.text)}>
              {getNameInitials(template.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              href={href}
              onClick={(event) => event.stopPropagation()}
              className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              {template.name}
            </Link>
            <div className="mt-0.5">
              <TemplateStatusBadge status={template.status} />
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${template.name}`}
              disabled={isDuplicating}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground shadow-sm transition-all duration-150 hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="z-80 min-w-44"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuItem asChild>
              <Link href={href}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(template)}>
              <FileText className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicate(template.id)}>
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => onDelete(template)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {template.subject ? (
        <p className="truncate text-small text-muted-foreground">
          {template.subject}
        </p>
      ) : null}

      <p className="line-clamp-3 flex-1 text-small text-muted-foreground/90">
        {preview || "No content yet."}
      </p>

      <div className="flex items-center gap-1.5 border-t border-border/60 pt-2.5 text-caption text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        {formatDate(template.createdAt)}
      </div>
    </motion.div>
  );
}
