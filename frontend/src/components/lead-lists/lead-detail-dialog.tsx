"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead } from "@/types/lead-list.types";

type DisplayField = "firstName" | "lastName" | "email" | "companyName" | "jobTitle" | "location" | "linkedinUrl" | "phone" | "website";

const FIELD_LABELS: Record<DisplayField, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  companyName: "Company",
  jobTitle: "Job Title",
  location: "Location",
  linkedinUrl: "LinkedIn URL",
  phone: "Phone",
  website: "Website",
};

const DISPLAY_FIELDS = Object.keys(FIELD_LABELS) as DisplayField[];

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  const customFieldEntries = lead ? Object.entries(lead.customFields) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {lead ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email || "Lead" : "Lead"}
          </DialogTitle>
          <DialogDescription>Lead details</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {!lead ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {DISPLAY_FIELDS.map((field) =>
                lead[field] ? (
                  <div key={field} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{FIELD_LABELS[field]}</span>
                    <span className="text-right font-medium text-foreground">{lead[field]}</span>
                  </div>
                ) : null
              )}

              {customFieldEntries.length > 0 ? (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-caption uppercase tracking-wide text-muted-foreground">Custom fields</p>
                  <div className="space-y-3">
                    {customFieldEntries.map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="text-right font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
