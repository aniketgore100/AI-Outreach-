"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  isSaving: boolean;
  onConfirm: (name: string) => void;
}

export function RenameTemplateDialog({ open, onOpenChange, currentName, isSaving, onConfirm }: RenameTemplateDialogProps) {
  const [name, setName] = useState(currentName);
  // The dialog surface stays mounted between opens (for the close
  // animation), so re-seed the field from the latest name each time it
  // opens — done during render (React's "adjusting state" pattern) rather
  // than in an effect, so it can't show a stale value for a frame first.
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setName(currentName);
  }

  const trimmed = name.trim();
  const canConfirm = trimmed.length > 0 && trimmed.length <= 150 && !isSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename template</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 p-5">
          <Label htmlFor="rename-template-name">Template name</Label>
          <Input
            id="rename-template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={150}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && canConfirm) onConfirm(trimmed);
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" disabled={!canConfirm} onClick={() => onConfirm(trimmed)}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
