"use client";

import { Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface ActivateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  isActivating: boolean;
  onConfirm: () => void;
}

export function ActivateCampaignDialog({
  open,
  onOpenChange,
  campaignName,
  isActivating,
  onConfirm,
}: ActivateCampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate campaign</DialogTitle>
          <DialogDescription>
            This will enroll every lead in <span className="font-medium text-foreground">{campaignName}</span>&apos;s
            lead list and start sending outreach emails on its configured schedule. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isActivating}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isActivating}>
            {isActivating ? <Spinner /> : <Rocket className="h-4 w-4" />}
            Activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
