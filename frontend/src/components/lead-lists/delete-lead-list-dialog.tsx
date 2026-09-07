"use client";

import { Trash2 } from "lucide-react";

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

interface DeleteLeadListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadListName: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteLeadListDialog({
  open,
  onOpenChange,
  leadListName,
  isDeleting,
  onConfirm,
}: DeleteLeadListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete lead list</DialogTitle>
          <DialogDescription>
            This will permanently delete <span className="font-medium text-foreground">{leadListName}</span> and all
            of its leads. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
