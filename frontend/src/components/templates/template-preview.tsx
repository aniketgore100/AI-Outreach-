"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidEmail } from "@/lib/email";
import { SAMPLE_LEAD, renderTemplateString } from "@/lib/template-render";
import type { GmailConnection } from "@/types/gmail-connection.types";

interface TemplatePreviewProps {
  subject: string;
  bodyHtml: string;
  connections: GmailConnection[];
  fromConnectionId: string;
  onFromConnectionChange: (id: string) => void;
  toEmail: string;
  onToEmailChange: (value: string) => void;
}

export function TemplatePreview({
  subject,
  bodyHtml,
  connections,
  fromConnectionId,
  onFromConnectionChange,
  toEmail,
  onToEmailChange,
}: TemplatePreviewProps) {
  const renderedSubject = renderTemplateString(subject, SAMPLE_LEAD) || "(No subject)";
  const renderedBody = renderTemplateString(bodyHtml, SAMPLE_LEAD);
  const hasBody = renderedBody.replace(/<[^>]+>/g, "").trim().length > 0;

  const connectedAccounts = connections.filter((connection) => connection.status === "connected");
  const toEmailError = toEmail.length > 0 && !isValidEmail(toEmail) ? "Enter a valid email address" : null;

  return (
    <motion.div
      className="flex h-full min-h-0 flex-col bg-card"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="space-y-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 text-small">
          <span className="shrink-0 text-muted-foreground">From</span>
          {connectedAccounts.length > 0 ? (
            <Select value={fromConnectionId} onValueChange={onFromConnectionChange}>
              <SelectTrigger className="h-8 flex-1 border-transparent bg-background/80 px-1.5 text-small shadow-none ring-1 ring-transparent transition hover:bg-background focus-visible:ring-ring">
                <SelectValue placeholder="Select a Gmail account" />
              </SelectTrigger>
              <SelectContent>
                {connectedAccounts.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground">
              No connected Gmail accounts -{" "}
              <Link href="/dashboard/connections" className="text-primary underline-offset-2 hover:underline">
                connect one
              </Link>
            </span>
          )}
        </div>

        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 text-small">
          <span className="shrink-0 text-muted-foreground">To</span>
          <Input
            type="email"
            value={toEmail}
            onChange={(event) => onToEmailChange(event.target.value)}
            placeholder="recipient@example.com"
            aria-invalid={Boolean(toEmailError)}
            className="h-8 flex-1 border-transparent bg-background/80 px-1.5 text-small shadow-none ring-1 ring-transparent transition hover:bg-background focus-visible:ring-ring"
          />
        </div>
        {toEmailError ? (
          <p className="flex items-center gap-1 pl-12 text-caption text-destructive">
            <CircleAlert className="h-3 w-3 shrink-0" />
            {toEmailError}
          </p>
        ) : null}

        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 text-small font-medium text-foreground">
          <span className="shrink-0 text-small font-normal text-muted-foreground">Subject</span>
          <span className="truncate">{renderedSubject}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {hasBody ? (
          // Rendering the template's own rich-text HTML (authored by this user via Tiptap), not third-party input.
          <div className="email-content" dangerouslySetInnerHTML={{ __html: renderedBody }} />
        ) : (
          <p className="text-small text-muted-foreground">Start writing to see your email take shape here.</p>
        )}
      </div>
    </motion.div>
  );
}
