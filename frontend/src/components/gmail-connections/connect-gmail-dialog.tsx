"use client";

import Image from "next/image";
import { CircleAlert, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearConnectError, startGoogleOAuth } from "@/store/slices/gmail-connection.slice";

interface ConnectGmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectGmailDialog({ open, onOpenChange }: ConnectGmailDialogProps) {
  const dispatch = useAppDispatch();
  const { connectStatus, connectError } = useAppSelector((state) => state.gmailConnections);

  const handleConfirm = async () => {
    const result = await dispatch(startGoogleOAuth());

    if (startGoogleOAuth.fulfilled.match(result)) {
      onOpenChange(false);
      window.location.assign(result.payload.authorizationUrl);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dispatch(clearConnectError());
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image src="/gmailLogo.png" alt="" width={20} height={20} unoptimized className="h-5 w-5" />
            Connect Gmail Account
          </DialogTitle>
          <DialogDescription>
            We&apos;ll send you to Google&apos;s consent screen so you can authorize this workspace securely. The
            connection will be created server-side after Google redirects back to us.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-5">
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            You&apos;ll sign in with Google, review the requested scopes, and then come right back here. No manual
            Gmail entry is needed.
          </div>
          {connectError ? (
            <p className="flex items-center gap-1.5 text-small text-destructive">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              {connectError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={connectStatus === "loading"} onClick={handleConfirm}>
            {connectStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Continue with Google
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
