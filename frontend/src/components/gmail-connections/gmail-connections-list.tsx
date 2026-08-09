"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/store/hooks";
import { disconnectGmailAccount, startGoogleOAuth } from "@/store/slices/gmail-connection.slice";
import type { GmailConnection } from "@/types/gmail-connection.types";

export function GmailConnectionsList({ connections }: { connections: GmailConnection[] }) {
  const dispatch = useAppDispatch();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (connections.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          icon={Mail}
          title="No Gmail accounts connected"
          description="Connect a Gmail account to start sending and tracking outreach from your own inbox."
        />
      </div>
    );
  }

  const handleDisconnect = async (id: string) => {
    setPendingId(id);
    const result = await dispatch(disconnectGmailAccount(id));
    setPendingId(null);

    if (disconnectGmailAccount.fulfilled.match(result)) {
      toast.success("Gmail account disconnected");
    } else {
      toast.error(result.payload ?? "Could not disconnect this account");
    }
  };

  const handleReconnect = async (email: string, id: string) => {
    setPendingId(id);

    const result = await dispatch(startGoogleOAuth(email));

    if (startGoogleOAuth.fulfilled.match(result)) {
      window.location.assign(result.payload.authorizationUrl);
      return;
    }

    toast.error(result.payload ?? "Could not reconnect this account");
    setPendingId(null);
  };

  const handleToggle = (connection: GmailConnection, nextChecked: boolean) => {
    if (nextChecked) {
      void handleReconnect(connection.email, connection.id);
    } else {
      void handleDisconnect(connection.id);
    }
  };

  return (
    <div>
      <ul className="divide-y divide-border">
        {connections.map((connection) => (
          <motion.li
            key={connection.id}
            className="flex items-center justify-between gap-4 px-4 py-2.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            layout
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted p-1.5">
                <Image src="/gmailLogo.png" alt="" width={20} height={20} unoptimized className="h-full w-full" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{connection.email}</p>
                <p className="text-small text-muted-foreground">
                  {connection.status === "connected"
                    ? `Connected ${formatDate(connection.connectedAt)}`
                    : `Disconnected ${connection.disconnectedAt ? formatDate(connection.disconnectedAt) : ""}`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {pendingId === connection.id ? <Spinner size="sm" className="text-muted-foreground" /> : null}
              <span
                className={cn(
                  "text-small font-medium",
                  connection.status === "connected" ? "text-success" : "text-muted-foreground"
                )}
              >
                {connection.status === "connected" ? "Connected" : "Disconnected"}
              </span>
              <Switch
                checked={connection.status === "connected"}
                disabled={pendingId === connection.id}
                onCheckedChange={(next) => handleToggle(connection, next)}
                aria-label={
                  connection.status === "connected"
                    ? `Disconnect ${connection.email}`
                    : `Reconnect ${connection.email}`
                }
              />
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
