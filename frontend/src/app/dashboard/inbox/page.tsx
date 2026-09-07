"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CornerDownLeft,
  MailCheck,
  MoreHorizontal,
  Reply,
  Send,
  SquarePen,
  X,
  Users,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { TemplateRichTextEditor } from "@/components/templates/template-rich-text-editor";
import { cn } from "@/lib/utils";
import { getNameInitials } from "@/lib/avatar";
import { useMinLoadingDuration } from "@/hooks/use-min-loading-duration";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearCurrentConversation,
  fetchConversation,
  fetchConversations,
  markConversationRead,
  refreshConversation,
  replyToConversation,
  setConversationArchived,
} from "@/store/slices/conversation.slice";
import type { ConversationDetail, ConversationMessage, ConversationStatus } from "@/types/conversation.types";

const POLL_INTERVAL_MS = 45_000;

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatListTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);

  if (diffDays <= 0 && date.getDate() === now.getDate()) {
    return formatShortTime(value);
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatThreadDay(value: string) {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function cleanSubject(subject: string) {
  return subject.replace(/^(re|fwd):\s*/i, "");
}

const COMPOSER_VARIANTS = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: "auto", opacity: 1 },
};

function StatusFilterBar({
  value,
  onChange,
}: {
  value: ConversationStatus | "all";
  onChange: (value: ConversationStatus | "all") => void;
}) {
  const options: Array<{ value: ConversationStatus | "all"; label: string }> = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center border-b-2 px-1.5 text-sm font-medium transition-colors",
              active
                ? "border-[#4F46E5] text-[#111827]"
                : "border-transparent text-[#6B7280] hover:border-[#E5E7EB] hover:text-[#111827]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ThreadMessage({
  message,
  threadSubject,
  leadName,
}: {
  message: ConversationMessage;
  threadSubject: string;
  leadName: string | null;
}) {
  const isOutgoing = message.direction === "outbound";
  const senderName = isOutgoing ? null : (leadName ?? message.fromEmail) || "Lead";
  const recipient = isOutgoing ? (leadName ?? message.toEmail) : "me";
  const hasHtml = message.bodyHtml.trim().length > 0;

  return (
    <div className="border-t border-[#E5E7EB] py-2.5 first:border-t-0 first:pt-0">
      <div className={cn("min-w-0 rounded-md px-2 py-1", isOutgoing ? "bg-[#F8F9FC]" : "bg-[#FFFFFF]")}>
        <div className="flex items-baseline gap-1.5">
          {senderName ? <span className="truncate text-sm font-medium text-foreground">{senderName}</span> : null}

          <span className="truncate text-sm font-medium text-foreground">To : {recipient}</span>
          <span className="ml-auto shrink-0 text-caption tabular-nums text-muted-foreground">
            {formatShortTime(message.sentAt)}
          </span>
        </div>
        <p className="mt-0.5 text-caption text-muted-foreground">
          Subject: {message.subject ? cleanSubject(message.subject) : threadSubject}
        </p>
        {hasHtml ? (
          <div
            className="mt-1.5 text-caption font-normal text-foreground **:text-caption **:font-normal **:text-foreground [&_p]:m-0 [&_p]:leading-5"
            dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
          />
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-caption leading-5 text-muted-foreground">
            {message.bodyText || message.snippet}
          </p>
        )}
      </div>
    </div>
  );
}

function ReplyComposer({
  subject,
  recipient,
  onCancel,
  onSend,
  content,
  onContentChange,
  editorKey,
  sending,
}: {
  subject: string;
  recipient: string;
  onCancel: () => void;
  onSend: () => void;
  content: string;
  onContentChange: (html: string) => void;
  editorKey: string;
  sending: boolean;
}) {
  return (
    <form
      className="w-full min-w-0 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] px-2.5 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <CornerDownLeft className="h-3 w-3 shrink-0 text-[#6B7280]" />
          <span className="shrink-0 text-caption text-[#6B7280]">Reply ·</span>
          <p className="truncate text-caption font-medium text-[#111827]">{cleanSubject(subject)}</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0 rounded-md text-[#6B7280] hover:bg-[#F8F9FC] hover:text-[#111827]"
          aria-label="Close reply composer"
          onClick={onCancel}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="border-b border-[#E5E7EB] px-2.5 py-1 text-caption text-[#6B7280]">
        <span className="font-medium text-[#111827]">To</span>
        <span className="ml-1.5 truncate">{recipient}</span>
      </div>

      <TemplateRichTextEditor
        key={editorKey}
        content={content}
        onChange={onContentChange}
        placeholder="Write your reply..."
        compact
        editorClassName="!min-h-[6rem] px-3 py-2 text-sm leading-6"
      />

      <div className="flex items-center justify-end gap-1.5 border-t border-[#E5E7EB] px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs font-medium text-[#6B7280] hover:bg-[#F8F9FC] hover:text-[#111827]"
          onClick={onCancel}
          disabled={sending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="h-7 gap-1 px-2.5 text-xs font-medium bg-[#4F46E5] text-white hover:bg-[#4338CA]" disabled={sending}>
          {sending ? <Spinner size="sm" /> : <Send className="h-3 w-3" />}
          Send
        </Button>
      </div>
    </form>
  );
}

function InboxThread({
  conversation,
  onMarkRead,
  onToggleArchive,
  onOpenReply,
  composerOpen,
  replySubject,
  replyHtml,
  replyEditorKey,
  replySending,
  onReplyHtmlChange,
  onCancelReply,
  onSendReply,
}: {
  conversation: ConversationDetail;
  onMarkRead: () => void;
  onToggleArchive: () => void;
  onOpenReply: () => void;
  composerOpen: boolean;
  replySubject: string;
  replyHtml: string;
  replyEditorKey: string;
  replySending: boolean;
  onReplyHtmlChange: (html: string) => void;
  onCancelReply: () => void;
  onSendReply: () => void;
}) {
  const displayName = conversation.leadName ?? conversation.leadEmail ?? "Unknown";
  const threadSubject = conversation.subject || "(no subject)";
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // When the composer is opening, its own entrance animation drives the
  // scroll (see onAnimationComplete below) so the two never race each
  // other — that race is what made the composer look like it was sliding
  // in half cut-off. This effect only handles the "new message arrived"
  // case, and skips entirely while the composer is open or closing.
  useLayoutEffect(() => {
    if (composerOpen) return;
    const container = threadScrollRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [composerOpen, conversation.messages.length]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex h-12 shrink-0 items-center border-b border-[#E5E7EB] px-3">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-medium text-foreground">{displayName}</h2>
              {conversation.leadCompany ? (
                <>
                  <span className="h-3.5 w-px shrink-0 bg-[#E5E7EB]" aria-hidden="true" />
                  <p className="truncate text-caption text-muted-foreground">{conversation.leadCompany}</p>
                </>
              ) : null}
            </div>
            <p className="truncate text-caption text-[#6B7280]">
              {conversation.campaignName ? `Campaign ${conversation.campaignName}` : threadSubject}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 rounded-md px-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F8F9FC] hover:text-[#111827]"
              onClick={onOpenReply}
            >
              <Reply className="h-3 w-3" />
              <span>Reply</span>
            </Button>
            {conversation.unreadCount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 rounded-md px-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F8F9FC] hover:text-[#111827]"
                onClick={onMarkRead}
              >
                <MailCheck className="h-3 w-3" />
                <span>Mark read</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 rounded-md px-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F8F9FC] hover:text-[#111827]"
              onClick={onToggleArchive}
            >
              <Archive className="h-3 w-3" />
              <span>{conversation.status === "archived" ? "Unarchive" : "Archive"}</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-md text-[#6B7280] hover:bg-[#F8F9FC] hover:text-[#111827]"
              aria-label="More conversation actions"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div ref={threadScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-3">
        <div className="min-w-0 space-y-3.5">
          <p className="text-caption uppercase tracking-[0.08em] text-[#6B7280]">
            {formatThreadDay(conversation.lastMessageAt ?? conversation.updatedAt)}
          </p>

          <div className="space-y-0">
            {conversation.messages.map((message) => (
              <ThreadMessage
                key={message.id}
                message={message}
                threadSubject={threadSubject}
                leadName={conversation.leadName}
              />
            ))}
          </div>

          <AnimatePresence initial={false}>
            {composerOpen ? (
              <motion.div
                ref={composerRef}
                variants={COMPOSER_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.2, ease: "easeOut" }}
                onAnimationComplete={(variant) => {
                  // Named variants make the completed phase unambiguous — only
                  // scroll once the entrance ("visible") has actually finished,
                  // never mid-transition and never on the way out.
                  if (variant === "visible") {
                    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                  }
                }}
                className="min-w-0 overflow-hidden pt-3"
              >
                <ReplyComposer
                  subject={replySubject}
                  recipient={conversation.leadEmail ?? displayName}
                  content={replyHtml}
                  onContentChange={onReplyHtmlChange}
                  onCancel={onCancelReply}
                  onSend={onSendReply}
                  editorKey={replyEditorKey}
                  sending={replySending}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const dispatch = useAppDispatch();
  const {
    items,
    status,
    error,
    current,
    currentStatus,
    currentError,
    replyStatus,
  } = useAppSelector((state) => state.conversations);

  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyHtml, setReplyHtml] = useState("<p></p>");
  const [replyEditorKey, setReplyEditorKey] = useState(0);

  useEffect(() => {
    void dispatch(fetchConversations({ status: statusFilter === "all" ? undefined : statusFilter, limit: 50 }));
  }, [dispatch, statusFilter]);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedConversationId(null);
      return;
    }

    const stillVisible = selectedConversationId ? items.some((item) => item.id === selectedConversationId) : false;
    if (!stillVisible) {
      setSelectedConversationId(items[0].id);
    }
  }, [items, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      dispatch(clearCurrentConversation());
      return;
    }

    void dispatch(fetchConversation(selectedConversationId));
    setComposerOpen(false);
    setReplyHtml("<p></p>");
    setReplyEditorKey((current) => current + 1);
  }, [dispatch, selectedConversationId]);

  // Opening a thread with unread messages marks it read, same convention
  // as any webmail client.
  useEffect(() => {
    if (current && current.id === selectedConversationId && current.unreadCount > 0) {
      void dispatch(markConversationRead(current.id));
    }
  }, [current, selectedConversationId, dispatch]);

  // Keeps the inbox live: the backend's own Gmail sync worker polls on its
  // own schedule, so the client polls too — the list always, the open
  // thread only when the composer isn't in use so a draft is never disrupted.
  useEffect(() => {
    const interval = setInterval(() => {
      void dispatch(fetchConversations({ status: statusFilter === "all" ? undefined : statusFilter, limit: 50 }));
      if (selectedConversationId && !composerOpen) {
        void dispatch(refreshConversation(selectedConversationId));
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [dispatch, statusFilter, selectedConversationId, composerOpen]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const openReplyComposer = () => {
    setReplyHtml("<p></p>");
    setReplyEditorKey((current) => current + 1);
    setComposerOpen(true);
  };

  const cancelReplyComposer = () => {
    setComposerOpen(false);
  };

  const sendReply = async () => {
    if (!current) return;

    const plainText = replyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plainText) return;

    const result = await dispatch(replyToConversation({ id: current.id, payload: { bodyHtml: replyHtml } }));
    if (replyToConversation.fulfilled.match(result)) {
      setComposerOpen(false);
      setReplyHtml("<p></p>");
      setReplyEditorKey((current) => current + 1);
    } else {
      toast.error(result.payload ?? "Could not send this reply");
    }
  };

  const markCurrentRead = async () => {
    if (!current) return;
    const result = await dispatch(markConversationRead(current.id));
    if (!markConversationRead.fulfilled.match(result)) {
      toast.error(result.payload ?? "Could not mark this conversation as read");
    }
  };

  const toggleArchiveSelected = async () => {
    if (!current) return;
    const archiving = current.status !== "archived";
    const result = await dispatch(setConversationArchived({ id: current.id, archived: archiving }));
    if (setConversationArchived.fulfilled.match(result)) {
      toast.success(archiving ? "Conversation archived" : "Conversation unarchived");
    } else {
      toast.error(result.payload ?? "Could not update this conversation");
    }
  };

  const hasFilters = statusFilter !== "all";
  const replySubject = current ? cleanSubject(current.subject || "(no subject)") : "";
  const isInitialListLoad = useMinLoadingDuration(status === "loading" && items.length === 0);
  const isThreadLoading = useMinLoadingDuration(
    Boolean(selectedConversationId) && currentStatus === "loading" && current?.id !== selectedConversationId
  );

  return (
    <motion.div
      className="h-full min-h-0 w-full overflow-hidden bg-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut", delay: 0.04 }}
    >
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)]">
        <section
          className={cn(
            "flex min-h-0 flex-col border-b border-border/70 bg-background lg:border-b-0 lg:border-r lg:border-border/70",
            sidebarCollapsed ? "lg:w-12" : "lg:w-85",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 border-b border-border/70 px-3 py-2",
              sidebarCollapsed && "justify-center px-0",
            )}
          >
            {!sidebarCollapsed ? <StatusFilterBar value={statusFilter} onChange={setStatusFilter} /> : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn("h-8 w-8 shrink-0 rounded-lg", !sidebarCollapsed && "ml-auto")}
              aria-label={sidebarCollapsed ? "Expand inbox sidebar" : "Collapse inbox sidebar"}
              onClick={() => setSidebarCollapsed((current) => !current)}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {!sidebarCollapsed && (hasFilters || error) ? (
            <div className="space-y-2 border-b border-border/70 px-3 py-2.5">
              {hasFilters ? (
                <div className="flex items-center justify-between gap-2 px-0.5 text-caption text-muted-foreground">
                  <span>Showing filtered conversations</span>
                  <button
                    type="button"
                    className="font-medium text-foreground transition hover:opacity-80"
                    onClick={() => {
                      setStatusFilter("all");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}

              {error ? (
                <p className="flex items-center gap-1.5 text-caption text-destructive">
                  <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          {!sidebarCollapsed ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isInitialListLoad ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : items.length > 0 ? (
              <div className="divide-y divide-border/70">
                {items.map((conversation) => {
                  const isSelected = conversation.id === selectedConversationId;
                  const displayName = conversation.leadName ?? conversation.leadEmail ?? "Unknown";

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-3 text-left transition",
                        "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        isSelected && "bg-accent/60",
                        sidebarCollapsed && "items-center gap-2 py-2.5",
                      )}
                    >
                      <Avatar className={cn("h-8 w-8 shrink-0", sidebarCollapsed && "h-6 w-6")}>
                        <AvatarFallback
                          className={cn(
                            "bg-zinc-200 font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                            sidebarCollapsed ? "text-[10px]" : "text-caption",
                          )}
                        >
                          {getNameInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate font-medium text-[#111827]",
                              sidebarCollapsed ? "text-caption" : "text-sm",
                            )}
                          >
                            {displayName}
                          </span>
                          {!sidebarCollapsed ? (
                            <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                              {formatListTimestamp(conversation.lastMessageAt ?? conversation.updatedAt)}
                            </span>
                          ) : null}
                        </div>
                        {!sidebarCollapsed ? (
                          <>
                            <p className="truncate text-caption">
                              {conversation.leadCompany ? <span className="text-[#166534]">{conversation.leadCompany} · </span> : null}
                              {/* <span>{conversation.leadEmail}</span> */}
                            </p>
                            <p className="truncate text-caption text-muted-foreground">
                              {conversation.lastMessagePreview || "No messages yet"}
                            </p>
                          </>
                        ) : null}
                      </div>

                      {sidebarCollapsed ? (
                        conversation.unreadCount > 0 ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        ) : null
                      ) : (
                        <div className="flex flex-col items-end gap-1.5 pt-0.5">
                          {conversation.unreadCount > 0 ? (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-caption font-medium text-primary-foreground">
                              {conversation.unreadCount}
                            </span>
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-6 py-10">
                <EmptyState
                  icon={Users}
                  title={hasFilters ? "No conversations match" : "No conversations yet"}
                  description={
                    hasFilters
                      ? "Adjust the status filter to see more conversations."
                      : "Once a campaign sends outreach and a lead replies, it shows up here."
                  }
                  className="border-none p-0"
                />
              </div>
            )}
          </div>
          ) : null}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden bg-background">

          {isThreadLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-4 h-40 w-full rounded-md" />
            </div>
          ) : current && current.id === selectedConversationId ? (
            <InboxThread
              conversation={current}
              onMarkRead={markCurrentRead}
              onToggleArchive={toggleArchiveSelected}
              onOpenReply={openReplyComposer}
              composerOpen={composerOpen}
              replySubject={replySubject}
              replyHtml={replyHtml}
              replyEditorKey={`${current.id}-${replyEditorKey}`}
              replySending={replyStatus === "loading"}
              onReplyHtmlChange={setReplyHtml}
              onCancelReply={cancelReplyComposer}
              onSendReply={() => void sendReply()}
            />
          ) : currentError ? (
            <div className="flex h-full items-center justify-center px-6 py-10">
              <EmptyState
                icon={CircleAlert}
                title="Couldn't load this conversation"
                description={currentError}
                className="border-none p-0"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 py-10">
              <EmptyState
                icon={ArrowUpRight}
                title="Select a conversation"
                description="Open any conversation on the left to view the full reply thread and follow-up history."
                className="border-none p-0"
              />
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
