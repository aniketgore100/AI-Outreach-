"use client";

import { useEffect, useState } from "react";
// import { useEffect, useState } from "react";

import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { ConnectGmailDialog } from "@/components/gmail-connections/connect-gmail-dialog";
import { GmailConnectionsList } from "@/components/gmail-connections/gmail-connections-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMinLoadingDuration } from "@/hooks/use-min-loading-duration";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGmailConnections } from "@/store/slices/gmail-connection.slice";

export function ConnectionsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { connections, limit, used, status } = useAppSelector((state) => state.gmailConnections);
  const isLimitLoading = useMinLoadingDuration(status === "loading" && limit === 0);
  const isConnectionsLoading = useMinLoadingDuration(status === "loading" && connections.length === 0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("gmailOAuthError");
  const oauthSuccess = searchParams.get("gmailOAuthSuccess");
  const oauthAccount = searchParams.get("gmailAccount");

  useEffect(() => {
    void dispatch(fetchGmailConnections());
  }, [dispatch]);

  const limitReached = used >= limit;

  useEffect(() => {
    if (!oauthSuccess) return;
    const timer = setTimeout(() => {
      router.replace("/dashboard/connections");
    }, 1000);

    return () => clearTimeout(timer);
  }, [oauthSuccess, router]);

  return (
    <div className="w-full space-y-3">
      {oauthSuccess ? (
        <motion.div
          className="flex items-start gap-2 rounded-md border border-success/25 bg-success/10 px-3 py-2.5 text-sm text-success"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {oauthAccount ? `${oauthAccount} connected successfully.` : "Google account connected successfully."}
          </p>
        </motion.div>
      ) : null}

      {oauthError ? (
        <motion.div
          className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{oauthError}</p>
        </motion.div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:max-w-2xl sm:grid-cols-2">
        <motion.div
          className="flex flex-col items-center gap-3 rounded-lg border border-border/70 bg-card px-6 py-6 text-center shadow-sm"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut", delay: 0.03 }}
        >
          <Image src="/gmailLogo.png" alt="Gmail" width={48} height={48} unoptimized className="h-12 w-12" />
          <div className="space-y-1">
            <h2 className="text-h3 text-foreground">Connect your Gmail</h2>
            <p className="text-small text-muted-foreground">Send and track outreach from your own inbox.</p>
          </div>

          <Button
            type="button"
            size="sm"
            className="w-full gap-2"
            disabled={limitReached}
            onClick={() => setDialogOpen(true)}
          >
            <Image src="/gmailLogo.png" alt="" width={16} height={16} unoptimized className="h-4 w-4" />
            Connect Gmail
          </Button>

          {isLimitLoading ? (
            <Skeleton className="h-3.5 w-24" />
          ) : (
            <p className="text-caption text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">{used}</span> / {limit} accounts connected
              {limitReached ? " · limit reached" : ""}
            </p>
          )}
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-3 rounded-lg border border-border/70 bg-card px-6 py-6 text-center shadow-sm"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut", delay: 0.05 }}
        >
          <Image src="/linkedInLogo.png" alt="LinkedIn" width={48} height={48} unoptimized className="h-12 w-12 rounded-lg" />
          <div className="space-y-1">
            <span className="flex items-center justify-center gap-1.5">
              <h2 className="text-h3 text-foreground">Connect LinkedIn</h2>
              <Badge variant="neutral">Coming soon</Badge>
            </span>
            <p className="text-small text-muted-foreground">Reach leads over LinkedIn alongside email.</p>
          </div>

          <Button type="button" size="sm" variant="secondary" className="w-full gap-2" disabled>
            <Image src="/linkedInLogo.png" alt="" width={16} height={16} unoptimized className="h-4 w-4 rounded-[3px]" />
            Connect LinkedIn
          </Button>
        </motion.div>
      </div>

      <motion.div
        className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.08 }}
      >
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="text-h3 text-foreground">Connected accounts</h2>
        </div>

        {isConnectionsLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <GmailConnectionsList connections={connections} />
        )}
      </motion.div>

      <ConnectGmailDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
