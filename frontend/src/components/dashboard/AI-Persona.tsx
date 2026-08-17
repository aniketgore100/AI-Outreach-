"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CircleAlert, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMinLoadingDuration } from "@/hooks/use-min-loading-duration";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGmailConnections } from "@/store/slices/gmail-connection.slice";
import {
  confirmPersonaImport,
  fetchPersonaCandidates,
  resetPersonaImport,
  setAllCandidatesIncluded,
  setCandidateIncluded,
  startPersonaImport,
  updatePersonaSelection,
} from "@/store/slices/persona-import.slice";
import { TimePeriodStep } from "@/components/ai-persona/time-period-step";
import { CandidateListStep } from "@/components/ai-persona/candidate-list-step";
import { ConfirmationStep } from "@/components/ai-persona/confirmation-step";
import type { StartImportPayload } from "@/types/persona-import.types";

interface AIPersonaProps {
  icon: ReactNode;
  title: string;
  description: string;
}

type WizardStep = "account" | "period" | "select" | "confirmation";

export function AIPersona({ icon, title, description }: AIPersonaProps) {
  const dispatch = useAppDispatch();

  const { connections, status: connectionsStatus } = useAppSelector((state) => state.gmailConnections);
  const {
    currentSet,
    startStatus,
    startError,
    candidates,
    pagination,
    candidatesStatus,
    updateSelectionStatus,
    updateSelectionError,
    confirmStatus,
    confirmError,
  } = useAppSelector((state) => state.personaImport);

  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>("account");

  useEffect(() => {
    void dispatch(fetchGmailConnections());
  }, [dispatch]);

  const connectedAccounts = useMemo(
    () => connections.filter((connection) => connection.status === "connected"),
    [connections]
  );

  // With exactly one connected account there's nothing to pick — treat it as
  // selected without an extra render-effect round trip.
  const activeConnectionId = selectedConnectionId ?? (connectedAccounts.length === 1 ? connectedAccounts[0].id : null);
  const effectiveStep: WizardStep = step === "account" && activeConnectionId ? "period" : step;

  const isLoadingConnections = useMinLoadingDuration(connectionsStatus === "loading" && connections.length === 0);
  const isFetchingCandidates = useMinLoadingDuration(candidatesStatus === "loading" && candidates.length === 0);

  const selectAccount = (id: string) => {
    setSelectedConnectionId(id);
    setStep("period");
  };

  const handleStartImport = async (payload: StartImportPayload) => {
    if (!activeConnectionId) return;
    const result = await dispatch(startPersonaImport({ gmailConnectionId: activeConnectionId, payload }));
    if (startPersonaImport.fulfilled.match(result)) {
      setStep("select");
      void dispatch(fetchPersonaCandidates({ setId: result.payload.id, limit: 200 }));
    }
  };

  const handleToggle = (id: string, included: boolean) => {
    dispatch(setCandidateIncluded({ id, included }));
    if (currentSet) void dispatch(updatePersonaSelection({ setId: currentSet.id, payload: { updates: [{ id, included }] } }));
  };

  const handleIncludeAll = (included: boolean) => {
    dispatch(setAllCandidatesIncluded(included));
    if (currentSet) void dispatch(updatePersonaSelection({ setId: currentSet.id, payload: { includeAll: included } }));
  };

  const handleConfirm = async () => {
    if (!currentSet) return;
    const result = await dispatch(confirmPersonaImport(currentSet.id));
    if (confirmPersonaImport.fulfilled.match(result)) {
      setStep("confirmation");
    }
  };

  const startOver = () => {
    dispatch(resetPersonaImport());
    setStep(connectedAccounts.length > 1 ? "account" : "period");
  };

  const selectedCount = candidates.filter((candidate) => candidate.included).length;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        {effectiveStep === "confirmation" ? <Badge variant="success">Source set saved</Badge> : null}
      </div>
      <p className="text-small text-muted-foreground">{description}</p>

      <div className="rounded-xl border border-border/70 bg-card px-6 py-6 shadow-sm">
        {isLoadingConnections ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ) : connectedAccounts.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Connect a Gmail account first"
            description="AI Persona training reads from a connected account's Sent folder. Connect one to get started."
            action={
              <Button type="button" size="sm" asChild>
                <Link href="/dashboard/connections">Go to Connections</Link>
              </Button>
            }
          />
        ) : effectiveStep === "account" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-foreground">Choose a Gmail account</h2>
              <p className="text-small text-muted-foreground">
                Each connected account has its own independent AI Persona, built only from its own sent mail.
              </p>
            </div>
            <ul className="divide-y divide-border/60 rounded-md border border-border/70">
              {connectedAccounts.map((account) => (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => selectAccount(account.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm transition-colors",
                      "hover:bg-accent/40"
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {account.email}
                    </span>
                    <span className="text-caption text-muted-foreground">Select</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : effectiveStep === "period" ? (
          <TimePeriodStep
            onStart={(payload) => void handleStartImport(payload)}
            isSubmitting={startStatus === "loading"}
            error={startError}
          />
        ) : effectiveStep === "select" ? (
          <CandidateListStep
            candidates={candidates}
            total={pagination?.total ?? candidates.length}
            isLoading={isFetchingCandidates}
            selectedCount={selectedCount}
            onToggle={handleToggle}
            onIncludeAll={handleIncludeAll}
            onConfirm={() => void handleConfirm()}
            isConfirming={confirmStatus === "loading"}
            error={updateSelectionError ?? confirmError}
          />
        ) : (
          <ConfirmationStep set={currentSet} onStartOver={startOver} />
        )}

        {updateSelectionStatus === "failed" && effectiveStep !== "select" ? (
          <p className="mt-3 flex items-center gap-1.5 text-small text-destructive">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            {updateSelectionError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
