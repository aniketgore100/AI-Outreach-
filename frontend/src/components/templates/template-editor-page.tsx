"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Editor } from "@tiptap/react";
import { motion } from "framer-motion";
import { ArrowLeft, CircleAlert, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { TemplatePreview } from "@/components/templates/template-preview";
import { TemplateRichTextEditor } from "@/components/templates/template-rich-text-editor";
import { VariablePicker } from "@/components/templates/variable-picker";
import { isValidEmail } from "@/lib/email";
import { findUnknownVariables } from "@/lib/template-render";
import { useMinLoadingDuration } from "@/hooks/use-min-loading-duration";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGmailConnections } from "@/store/slices/gmail-connection.slice";
import {
  clearCurrentTemplate,
  clearSendTestResult,
  createTemplate,
  fetchTemplate,
  sendTestEmail,
  updateTemplate,
} from "@/store/slices/template.slice";
import type { TemplateStatus } from "@/types/template.types";

type EditorMode = "new" | "edit";
type ActiveField = "subject" | "body";

const EMPTY_STATE = { name: "", subject: "", bodyHtml: "", status: "draft" as TemplateStatus };

export function TemplateEditorPage({ mode }: { mode: EditorMode }) {
  const params = useParams<{ id?: string }>();
  const templateId = mode === "edit" ? params.id : undefined;

  // Keyed so switching templates fully remounts the editor and avoids
  // stale local state from the previous record.
  return <TemplateEditorPageContent key={mode === "edit" ? templateId : "new"} mode={mode} templateId={templateId} />;
}

function TemplateEditorPageContent({ mode, templateId }: { mode: EditorMode; templateId?: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { current, currentStatus, saveStatus, saveError, sendTestStatus, sendTestError } = useAppSelector(
    (state) => state.templates
  );
  const { connections: gmailConnections, status: gmailConnectionsStatus } = useAppSelector(
    (state) => state.gmailConnections
  );

  const [name, setName] = useState(EMPTY_STATE.name);
  const [subject, setSubject] = useState(EMPTY_STATE.subject);
  const [bodyHtml, setBodyHtml] = useState(EMPTY_STATE.bodyHtml);
  const [hasSyncedFromServer, setHasSyncedFromServer] = useState(false);

  const [activeField, setActiveField] = useState<ActiveField>("body");
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const [testFromConnectionId, setTestFromConnectionId] = useState("");
  const [hasDefaultedTestFrom, setHasDefaultedTestFrom] = useState(false);
  const [testToEmail, setTestToEmail] = useState("");

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState("");
  const [saveDialogStatus, setSaveDialogStatus] = useState<TemplateStatus>("active");

  useEffect(() => {
    if (mode === "edit" && templateId) {
      void dispatch(fetchTemplate(templateId));
    }

    return () => {
      dispatch(clearCurrentTemplate());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, templateId]);

  useEffect(() => {
    void dispatch(fetchGmailConnections());
  }, [dispatch]);

  useEffect(() => {
    if (sendTestStatus !== "succeeded") return;
    const timeout = setTimeout(() => dispatch(clearSendTestResult()), 6000);
    return () => clearTimeout(timeout);
  }, [sendTestStatus, dispatch]);

  const connectedAccounts = gmailConnections.filter((connection) => connection.status === "connected");

  if (!hasDefaultedTestFrom && gmailConnectionsStatus === "succeeded") {
    setHasDefaultedTestFrom(true);
    if (connectedAccounts.length > 0) setTestFromConnectionId(connectedAccounts[0].id);
  }

  if (mode === "edit" && current && !hasSyncedFromServer) {
    setHasSyncedFromServer(true);
    const snapshot = {
      name: current.name,
      subject: current.subject,
      bodyHtml: current.bodyHtml,
    };
    setName(snapshot.name);
    setSubject(snapshot.subject);
    setBodyHtml(snapshot.bodyHtml);
  }

  const unknownVariables = useMemo(
    () => Array.from(new Set([...findUnknownVariables(subject), ...findUnknownVariables(bodyHtml)])),
    [subject, bodyHtml]
  );

  const isLoadingExisting = useMinLoadingDuration(mode === "edit" && currentStatus === "loading" && !current);

  const isTestEmailValid = isValidEmail(testToEmail);
  const sendTestBlockedReason = !templateId
    ? "Save the template before sending a test"
    : !testFromConnectionId
      ? "Select a Gmail account to send from"
      : !isTestEmailValid
        ? "Enter a valid recipient email"
        : null;
  const canSendTest = sendTestBlockedReason === null && sendTestStatus !== "loading";

  const openSaveDialog = (nextStatus: TemplateStatus) => {
    setSaveDialogStatus(nextStatus);
    setSaveDialogName(name.trim() || current?.name || "");
    setSaveDialogOpen(true);
  };

  const insertVariable = (token: string) => {
    if (activeField === "body" && editorInstance) {
      editorInstance.chain().focus().insertContent(token).run();
      return;
    }

    const input = subjectInputRef.current;
    if (input) {
      const start = input.selectionStart ?? subject.length;
      const end = input.selectionEnd ?? subject.length;
      const next = `${subject.slice(0, start)}${token}${subject.slice(end)}`;
      setSubject(next);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + token.length, start + token.length);
      });
    } else {
      setSubject((prev) => prev + token);
    }
  };

  const handleSave = async (nextStatus: TemplateStatus, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) return;

    const payload = { name: trimmedName, subject, bodyHtml, status: nextStatus };

    if (mode === "new") {
      const result = await dispatch(createTemplate(payload));
      if (createTemplate.fulfilled.match(result)) {
        setName(trimmedName);
        setSaveDialogOpen(false);
        router.replace(`/dashboard/templates/${result.payload.id}`);
      }
      return;
    }

    if (templateId) {
      const result = await dispatch(updateTemplate({ id: templateId, payload }));
      if (updateTemplate.fulfilled.match(result)) {
        setName(trimmedName);
        setSaveDialogOpen(false);
      }
    }
  };

  const handleSendTest = () => {
    if (!templateId || !canSendTest) return;
    void dispatch(
      sendTestEmail({ id: templateId, payload: { gmailConnectionId: testFromConnectionId, recipientEmail: testToEmail } })
    );
  };

  if (isLoadingExisting) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-[72vh] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <Link
        href="/dashboard/templates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Templates
      </Link>

      {sendTestStatus === "failed" && sendTestError ? (
        <p className="flex items-center gap-1.5 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-small text-destructive">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {sendTestError}
        </p>
      ) : null}

      {saveStatus === "failed" && saveError ? (
        <p className="flex items-center gap-1.5 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-small text-destructive">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {saveError}
        </p>
      ) : null}

      {unknownVariables.length > 0 ? (
        <p className="flex items-center gap-1.5 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-small text-warning">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          Unknown variable{unknownVariables.length > 1 ? "s" : ""}:{" "}
          {unknownVariables.map((token) => `{{${token}}}`).join(", ")}
        </p>
      ) : null}

      <motion.div
        className="grid min-h-144 grid-cols-1 overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm lg:h-[calc(100vh-14rem)] lg:grid-cols-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <section className="flex min-w-0 min-h-0 flex-col border-b border-border/70 lg:border-b-0 lg:border-r">
          <div className="border-b border-border/60 bg-muted/40 px-4 py-2.5">
            <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
              <label htmlFor="template-subject" className="text-small font-medium text-foreground">
                Subject
              </label>
              <Input
                id="template-subject"
                ref={subjectInputRef}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                onFocus={() => setActiveField("subject")}
                placeholder="Quick idea for {{companyName}}"
                className="h-8 rounded-md border-transparent bg-background/80 text-sm shadow-none ring-1 ring-transparent transition focus-visible:bg-background focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <TemplateRichTextEditor
              content={bodyHtml}
              onChange={setBodyHtml}
              onFocus={() => setActiveField("body")}
              onEditorReady={setEditorInstance}
              placeholder="Write your email… use Insert Variable to personalize it"
              toolbarEndActions={<VariablePicker onInsert={insertVariable} />}
            />
          </div>
        </section>

        <section className="flex min-w-0 min-h-0 flex-col">
          <TemplatePreview
            subject={subject}
            bodyHtml={bodyHtml}
            connections={gmailConnections}
            fromConnectionId={testFromConnectionId}
            onFromConnectionChange={setTestFromConnectionId}
            toEmail={testToEmail}
            onToEmailChange={setTestToEmail}
          />
        </section>
      </motion.div>

      <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border/70 bg-card px-4 py-3 shadow-sm">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={saveStatus === "loading"}
          onClick={() => openSaveDialog("draft")}
        >
          <Save className="h-4 w-4" />
          Save as Draft
        </Button>
        <Button type="button" size="sm" disabled={saveStatus === "loading"} onClick={() => openSaveDialog("active")}>
          <Save className="h-4 w-4" />
          Save Template
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canSendTest}
          title={sendTestBlockedReason ?? undefined}
          onClick={handleSendTest}
        >
          {sendTestStatus === "loading" ? <Spinner /> : <Send className="h-4 w-4" />}
          Send Test
        </Button>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>{saveDialogStatus === "draft" ? "Save draft" : "Save template"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4 px-5 pb-5 pt-1"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave(saveDialogStatus, saveDialogName);
            }}
          >
            <Input
              autoFocus
              required
              value={saveDialogName}
              onChange={(event) => setSaveDialogName(event.target.value)}
              placeholder="Template name"
              className="h-10 rounded-md border-transparent bg-background/80 shadow-none ring-1 ring-transparent transition focus-visible:bg-background focus-visible:ring-ring"
            />
            <DialogFooter className="px-0 pb-0 pt-1">
              <Button type="button" variant="secondary" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{saveDialogStatus === "draft" ? "Save Draft" : "Save Template"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
