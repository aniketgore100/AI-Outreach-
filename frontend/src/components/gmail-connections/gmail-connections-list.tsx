"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, Loader2, Mail, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { useAppDispatch } from "@/store/hooks";
import { disconnectGmailAccount, startGoogleOAuth } from "@/store/slices/gmail-connection.slice";
import type { GmailConnection } from "@/types/gmail-connection.types";

export function GmailConnectionsList({ connections }: { connections: GmailConnection[] }) {
  const dispatch = useAppDispatch();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="No Gmail accounts connected"
        description="Connect a Gmail account to start sending and tracking outreach from your own inbox."
      />
    );
  }

  const handleDisconnect = async (id: string) => {
    setPendingId(id);
    await dispatch(disconnectGmailAccount(id));
    setPendingId(null);
  };

  const handleReconnect = async (email: string, id: string) => {
    setPendingId(id);
    setReconnectError(null);

    const result = await dispatch(startGoogleOAuth(email));

    if (startGoogleOAuth.fulfilled.match(result)) {
      window.location.assign(result.payload.authorizationUrl);
      return;
    }

    if (!startGoogleOAuth.fulfilled.match(result)) {
      setReconnectError(result.payload ?? "Could not reconnect this account");
    }

    setPendingId(null);
  };

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {reconnectError ? (
          <motion.p
            key="reconnect-error"
            className="flex items-center gap-1.5 text-small text-destructive"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            {reconnectError}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
        {connections.map((connection) => (
          <motion.li
            key={connection.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            layout
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{connection.email}</p>
                <p className="text-small text-muted-foreground">
                  {connection.status === "connected"
                    ? `Connected ${formatDate(connection.connectedAt)}`
                    : `Disconnected ${connection.disconnectedAt ? formatDate(connection.disconnectedAt) : ""}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={connection.status === "connected" ? "success" : "neutral"}>
                {connection.status === "connected" ? "Connected" : "Disconnected"}
              </Badge>

              {connection.status === "connected" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pendingId === connection.id}
                  onClick={() => handleDisconnect(connection.id)}
                >
                  {pendingId === connection.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pendingId === connection.id}
                  onClick={() => handleReconnect(connection.email, connection.id)}
                >
                  {pendingId === connection.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Reconnect
                </Button>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
