"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { ConnectGmailDialog } from "@/components/gmail-connections/connect-gmail-dialog";
import { GmailConnectionsList } from "@/components/gmail-connections/gmail-connections-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGmailConnections } from "@/store/slices/gmail-connection.slice";
import {useRouter} from "next/navigation";

export function ConnectionsPage() {
  const dispatch = useAppDispatch();
  const { connections, limit, used, status } = useAppSelector((state) => state.gmailConnections);
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("gmailOAuthError");
  const oauthSuccess = searchParams.get("gmailOAuthSuccess");
  const oauthAccount = searchParams.get("gmailAccount");

  useEffect(() => {
    void dispatch(fetchGmailConnections());
  }, [dispatch]);

  const limitReached = used >= limit;


    const router = useRouter();

    useEffect(() => {
      if(!oauthSuccess) return;
      const timer = setTimeout(() => {
        router.replace("/dashboard/connections");
      }, 1000);

      return () => clearTimeout(timer);
    }, [])

  return (
    <div className="w-full space-y-8">
      {oauthSuccess ? (
        <motion.div
          className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {oauthAccount ? `${oauthAccount} connected successfully.` : "Google account connected successfully."}
          </p>
        </motion.div>
      ) : null}

      {oauthError ? (
        <motion.div
          className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{oauthError}</p>
        </motion.div>
      ) : null}

      <motion.div
        className="flex items-start justify-between gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div>
          <h1 className="text-h1 text-foreground">Connections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the Gmail accounts this workspace uses to send and track outreach.
          </p>
        </div>

        <Button type="button" className="shrink-0 gap-2" disabled={limitReached} onClick={() => setDialogOpen(true)}>
          <GoogleIcon className="h-4 w-4" />
          Connect Google Account
        </Button>
      </motion.div>

      <motion.div
        className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.03 }}
      >
        <span className="text-sm text-foreground">
          {status === "loading" && limit === 0 ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <>
              <span className="font-semibold tabular-nums">{used}</span>
              <span className="text-muted-foreground"> / {limit} accounts connected</span>
            </>
          )}
        </span>
        {limitReached ? (
          <span className="text-small text-muted-foreground">
            You&apos;ve reached the maximum for this workspace.
          </span>
        ) : null}
      </motion.div>

      {status === "loading" && connections.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <GmailConnectionsList connections={connections} />
      )}

      <ConnectGmailDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
