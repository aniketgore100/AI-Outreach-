"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Globe,
  Save,
  Send,
} from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VariablePicker } from "@/components/templates/variable-picker";
import { TemplateRichTextEditor } from "@/components/templates/template-rich-text-editor";
import { formatDate, stripHtml } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchLeadLists } from "@/store/slices/lead-list.slice";
import { fetchTemplates, updateTemplate } from "@/store/slices/template.slice";
import {
  clearCurrentCampaign,
  createCampaign,
  fetchCampaign,
  finalizeCampaign,
  updateCampaignDetails,
  updateCampaignLeadList,
  updateFollowUp,
  updateInitialOutreach,
  updateReplyHandling,
  upsertCampaignSchedule,
} from "@/store/slices/campaign.slice";
import { useMinLoadingDuration } from "@/hooks/use-min-loading-duration";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type {
  CampaignConfigurationState,
  CampaignDetail,
  CampaignReplyMethod,
  CampaignWeekday,
} from "@/types/campaign.types";
import type { EmailTemplate } from "@/types/template.types";
import type { Editor } from "@tiptap/react";

type ValidationErrors = Partial<Record<
  | "name"
  | "initialTemplateId"
  | "replyTemplateId"
  | "followUpTemplateId"
  | "followUpDelayDays"
  | "leadListId"
  | "startTime"
  | "endTime"
  | "weekdays"
  | "timeZone",
  string
>>;

type SubmissionMode = "draft" | "launch";
type PageMode = "new" | "edit";

const STEP_DEFS = [
  { label: "Campaign Details", description: "Name this campaign and describe who it's for." },
  { label: "Outreach Sequence", description: "Set the template flow and reply handling." },
  { label: "Lead List", description: "Pick the target lead list." },
  { label: "Schedule", description: "Set send windows and days." },
  { label: "Time Zone", description: "Choose the campaign time zone." },
  { label: "Review & Launch", description: "Review before saving or launching." },
] as const;

const STEPS = STEP_DEFS.map((step) => step.label);

const WEEKDAYS: Array<{ value: CampaignWeekday; label: string }> = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

const DEFAULT_FORM: CampaignConfigurationState = {
  name: "",
  description: "",
  leadListId: "",
  schedule: {
    startTime: "",
    endTime: "",
    weekdays: [],
    timeZone: "",
  },
  sequence: {
    initialTemplateId: "",
    replyMethod: "manual",
    replyTemplateId: "",
    followUpEnabled: false,
    followUpTemplateId: "",
    followUpDelayDays: "",
  },
};

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

function getTimezoneOptions() {
  const supported = typeof Intl !== "undefined" && "supportedValuesOf" in Intl
    ? (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? []
    : [];

  const browserTimeZone = getBrowserTimeZone();
  const prioritized = browserTimeZone ? [browserTimeZone] : [];
  const all = [...prioritized, ...supported].filter(Boolean);
  return Array.from(new Set(all));
}

function formatWeekdays(values: CampaignWeekday[]) {
  if (values.length === 0) return "No days selected";
  return WEEKDAYS.filter((day) => values.includes(day.value)).map((day) => day.label).join(", ");
}

function validateTimeRange(startTime: string, endTime: string) {
  if (!startTime || !endTime) return true;
  return startTime < endTime;
}

/** Maps the server's saved config back onto the local wizard form shape. */
function detailToFormState(detail: CampaignDetail): CampaignConfigurationState {
  return {
    name: detail.name,
    description: detail.description,
    leadListId: detail.leadListId ?? "",
    schedule: {
      startTime: detail.schedule?.startTime ?? "",
      endTime: detail.schedule?.endTime ?? "",
      weekdays: detail.schedule?.weekdays ?? [],
      timeZone: detail.schedule?.timeZone ?? "",
    },
    sequence: {
      initialTemplateId: detail.sequence.initialTemplateId ?? "",
      replyMethod: detail.sequence.replyMethod,
      replyTemplateId: detail.sequence.replyTemplateId ?? "",
      followUpEnabled: detail.sequence.followUpEnabled,
      followUpTemplateId: detail.sequence.followUpTemplateId ?? "",
      followUpDelayDays:
        detail.sequence.followUpDelayDays !== null ? String(detail.sequence.followUpDelayDays) : "",
    },
  };
}

/** Resumes on the first step the server doesn't have saved data for yet,
 * or on Review if everything is already complete. */
function resumeStepFromCompletedSteps(completedSteps: CampaignDetail["completedSteps"]) {
  if (!completedSteps.details) return 0;
  if (!completedSteps.sequence) return 1;
  if (!completedSteps.leadList) return 2;
  if (!completedSteps.schedule) return 3;
  return STEPS.length - 1;
}

function StepNavItem({
  index,
  label,
  active,
  completed,
  selectable,
  onSelect,
}: {
  index: number;
  label: string;
  active: boolean;
  completed: boolean;
  selectable: boolean;
  onSelect: () => void;
}) {
  const badge = (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-caption font-semibold transition-colors",
        active && "bg-primary text-primary-foreground",
        completed && !active && "bg-[#166534] text-white",
        !completed && !active && "bg-muted text-muted-foreground",
      )}
    >
      {completed ? <Check className="h-3 w-3" /> : index + 1}
    </span>
  );

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onSelect}
      aria-current={active ? "step" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-accent text-foreground"
          : selectable
            ? cn("text-muted-foreground hover:bg-accent/60 hover:text-foreground", completed && !active && "text-[#52525b]")
            : "cursor-not-allowed text-muted-foreground/40",
      )}
    >
      {badge}
      <span className={cn("truncate", active && "font-medium text-foreground")}>{label}</span>
    </button>
  );
}

function StepsSidebar({
  campaignName,
  currentStep,
  furthestStep,
  onStepSelect,
  onBack,
  backDisabled,
}: {
  campaignName: string;
  currentStep: number;
  furthestStep: number;
  onStepSelect: (step: number) => void;
  onBack: () => void;
  backDisabled: boolean;
}) {
  return (
    <section className="flex min-h-0 w-full flex-col border-b border-border/70 bg-background lg:w-60 lg:border-b-0 lg:border-r lg:border-border/70">
      <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border/70 px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-ml-1.5 h-8 w-8 shrink-0 rounded-lg"
          onClick={onBack}
          disabled={backDisabled}
          aria-label="Back to previous step"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="truncate text-sm font-semibold text-foreground">{campaignName || "New Campaign"}</span>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {STEP_DEFS.map((step, index) => (
            <StepNavItem
              key={step.label}
              index={index}
              label={step.label}
              active={index === currentStep}
              completed={index < furthestStep}
              selectable={index <= furthestStep}
              onSelect={() => onStepSelect(index)}
            />
          ))}
        </div>
      </nav>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-caption text-destructive">
      <CircleAlert className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

function CompactLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{children}</span>;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-small text-muted-foreground">{label}</span>
      <div className="max-w-[65%] text-right text-small font-medium text-foreground">{value}</div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

function StepSection({
  title,
  description,
  action,
  divider = true,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-4", divider && "border-t border-border/60 pt-8")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-small text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function TemplatePreview({
  template,
}: {
  template: EmailTemplate;
}) {
  const hasBody = stripHtml(template.bodyHtml).trim().length > 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
        <span className="shrink-0 text-caption text-muted-foreground">{formatDate(template.updatedAt)}</span>
      </div>
      <p className="truncate text-caption text-muted-foreground">Subject: {template.subject || "No subject"}</p>
      {hasBody ? (
        <div
          className="email-content max-h-32 overflow-hidden rounded-md bg-muted/40 px-3 py-2.5 text-sm"
          dangerouslySetInnerHTML={{ __html: template.bodyHtml }}
        />
      ) : (
        <p className="text-small text-muted-foreground">This template has no body content yet.</p>
      )}
    </div>
  );
}

function TemplateEditorInline({
  template,
  draft,
  onDraftChange,
  onCancel,
  onSave,
  saving,
}: {
  template: EmailTemplate;
  draft: { subject: string; bodyHtml: string };
  onDraftChange: (draft: { subject: string; bodyHtml: string }) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const insertVariable = (token: string) => {
    if (activeField === "body" && editorInstance) {
      editorInstance.chain().focus().insertContent(token).run();
      return;
    }

    const input = subjectInputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? draft.subject.length;
    const end = input.selectionEnd ?? draft.subject.length;
    const nextSubject = `${draft.subject.slice(0, start)}${token}${draft.subject.slice(end)}`;
    onDraftChange({ ...draft, subject: nextSubject });

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="space-y-2">
          <CompactLabel>Subject</CompactLabel>
          <Input
            ref={subjectInputRef}
            value={draft.subject}
            onChange={(event) => onDraftChange({ ...draft, subject: event.target.value })}
            onFocus={() => setActiveField("subject")}
            className="h-8 text-sm"
            placeholder="Quick idea for {{companyName}}"
          />
          <p className="text-caption text-muted-foreground">
            Editing this template updates the shared email template used across the workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          <Button type="button" size="sm" variant="secondary" className="h-8 px-3 text-sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="h-8 px-3 text-sm" onClick={onSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : null}
            Save changes
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border/60">
        <TemplateRichTextEditor
          key={template.id}
          content={draft.bodyHtml}
          onChange={(bodyHtml) => onDraftChange({ ...draft, bodyHtml })}
          onFocus={() => setActiveField("body")}
          onEditorReady={setEditorInstance}
          placeholder="Write the template body..."
          toolbarEndActions={<VariablePicker onInsert={insertVariable} />}
          editorClassName="min-h-[16rem] px-4 py-3 text-sm leading-6"
        />
      </div>
    </div>
  );
}

export function CampaignConfigurationPage({ mode }: { mode: PageMode }) {
  const params = useParams<{ id?: string }>();
  const campaignId = mode === "edit" ? params.id : undefined;

  return (
    <CampaignConfigurationPageContent
      key={mode === "edit" ? campaignId : "new"}
      mode={mode}
      campaignId={campaignId}
    />
  );
}

function CampaignConfigurationPageContent({ mode, campaignId }: { mode: PageMode; campaignId?: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const {
    items: templates,
    status: templatesStatus,
    error: templatesError,
    saveStatus: templateSaveStatus,
    saveError: templateSaveError,
  } = useAppSelector((state) => state.templates);


  const {
    items: leadLists,
    status: leadListsStatus,
    error: leadListsError,
  } = useAppSelector((state) => state.leadLists);

  
  const {
    current: campaign,
    currentStatus: campaignStatus,
    currentError: campaignError,
    saveStatus,
    saveError,
    finalizeStatus,
    finalizeError,
  } = useAppSelector((state) => state.campaigns);

  const [currentStep, setCurrentStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [form, setForm] = useState<CampaignConfigurationState>(DEFAULT_FORM);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{ mode: SubmissionMode; at: string } | null>(null);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<{ subject: string; bodyHtml: string } | null>(null);
  const hasLoadedDataRef = useRef(false);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedDataRef.current) return;
    hasLoadedDataRef.current = true;

    if (templatesStatus !== "loading") {
      void dispatch(fetchTemplates({ page: 1, limit: 100 }));
    }
    if (leadListsStatus !== "loading") {
      void dispatch(fetchLeadLists({ page: 1, limit: 100 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (mode === "edit" && campaignId) {
      void dispatch(fetchCampaign(campaignId));
    }

    return () => {
      dispatch(clearCurrentCampaign());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, campaignId]);

  useEffect(() => {
    if (mode === "edit" && campaign && campaign.id === campaignId && !hasHydratedRef.current) {
      hasHydratedRef.current = true;
      setForm(detailToFormState(campaign));
      const resumeStep = resumeStepFromCompletedSteps(campaign.completedSteps);
      setFurthestStep(resumeStep);
      setCurrentStep(resumeStep);
    }
  }, [mode, campaign, campaignId]);

  useEffect(() => {
    if (!form.schedule.timeZone) {
      const timeZone = getBrowserTimeZone();
      if (timeZone) {
        setForm((current) => ({
          ...current,
          schedule: { ...current.schedule, timeZone },
        }));
      }
    }
  }, [form.schedule.timeZone]);

  const selectedInitialTemplate = useMemo(
    () => templates.find((template) => template.id === form.sequence.initialTemplateId) ?? null,
    [form.sequence.initialTemplateId, templates],
  );
  const selectedReplyTemplate = useMemo(
    () => templates.find((template) => template.id === form.sequence.replyTemplateId) ?? null,
    [form.sequence.replyTemplateId, templates],
  );
  const selectedFollowUpTemplate = useMemo(
    () => templates.find((template) => template.id === form.sequence.followUpTemplateId) ?? null,
    [form.sequence.followUpTemplateId, templates],
  );
  const selectedLeadList = useMemo(
    () => leadLists.find((leadList) => leadList.id === form.leadListId) ?? null,
    [form.leadListId, leadLists],
  );

  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

  useEffect(() => {
    setEditingTemplateId(null);
    setTemplateDraft(null);
  }, [form.sequence.initialTemplateId]);

  const selectedTemplateForEdit = editingTemplateId
    ? templates.find((template) => template.id === editingTemplateId) ?? null
    : null;

  const handleStepSelect = (step: number) => {
    if (step <= furthestStep) {
      setCurrentStep(step);
      setValidationErrors({});
      setStepError(null);
    }
  };

  const updateForm = <K extends keyof CampaignConfigurationState>(key: K, value: CampaignConfigurationState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateSequence = (patch: Partial<CampaignConfigurationState["sequence"]>) => {
    setForm((current) => ({ ...current, sequence: { ...current.sequence, ...patch } }));
  };

  const updateSchedule = (patch: Partial<CampaignConfigurationState["schedule"]>) => {
    setForm((current) => ({ ...current, schedule: { ...current.schedule, ...patch } }));
  };

  const toggleWeekday = (weekday: CampaignWeekday) => {
    setForm((current) => {
      const weekdays = current.schedule.weekdays.includes(weekday)
        ? current.schedule.weekdays.filter((day) => day !== weekday)
        : [...current.schedule.weekdays, weekday];
      return { ...current, schedule: { ...current.schedule, weekdays } };
    });
  };

  const validate = (step: number | "all") => {
    const nextErrors: ValidationErrors = {};

    const checkStep1 = () => {
      if (!form.name.trim()) nextErrors.name = "Campaign name is required.";
    };
    const checkStep2 = () => {
      if (!form.sequence.initialTemplateId) {
        nextErrors.initialTemplateId = "Select an initial outreach template.";
      }
      if (form.sequence.replyMethod === "template" && !form.sequence.replyTemplateId) {
        nextErrors.replyTemplateId = "Select a reply template.";
      }
      if (form.sequence.followUpEnabled) {
        if (!form.sequence.followUpTemplateId) nextErrors.followUpTemplateId = "Select a follow-up template.";
        const delay = Number.parseInt(form.sequence.followUpDelayDays, 10);
        if (!Number.isFinite(delay) || delay <= 0) {
          nextErrors.followUpDelayDays = "Enter a valid delay in days.";
        }
      }
    };
    const checkStep3 = () => {
      if (!form.leadListId) nextErrors.leadListId = "Choose a lead list for the campaign.";
    };
    const checkStep4 = () => {
      if (!form.schedule.startTime) nextErrors.startTime = "Start time is required.";
      if (!form.schedule.endTime) nextErrors.endTime = "End time is required.";
      if (form.schedule.weekdays.length === 0) nextErrors.weekdays = "Choose at least one day.";
      if (form.schedule.startTime && form.schedule.endTime && !validateTimeRange(form.schedule.startTime, form.schedule.endTime)) {
        nextErrors.endTime = "End time must be later than start time.";
      }
    };
    const checkStep5 = () => {
      if (!form.schedule.timeZone) nextErrors.timeZone = "Select a time zone.";
    };

    if (step === "all" || step >= 0) checkStep1();
    if (step === "all" || step >= 1) checkStep2();
    if (step === "all" || step >= 2) checkStep3();
    if (step === "all" || step >= 3) checkStep4();
    if (step === "all" || step >= 4) checkStep5();

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  /** Persists whichever step is about to be left, in the shape that step's
   * dedicated endpoint expects. Returns false (and sets stepError) on failure
   * so goNext can stop instead of advancing past unsaved data. */
  const persistStep = async (step: number): Promise<boolean> => {
    if (step === 0) {
      if (mode === "new" && !campaignId) {
        const result = await dispatch(createCampaign({ name: form.name, description: form.description }));
        if (createCampaign.fulfilled.match(result)) {
          router.replace(`/dashboard/campaigns/${result.payload.id}`);
          return true;
        }
        setStepError(result.payload ?? "Could not create this campaign");
        return false;
      }

      if (!campaignId) return false;
      const result = await dispatch(
        updateCampaignDetails({ id: campaignId, payload: { name: form.name, description: form.description } }),
      );
      if (!updateCampaignDetails.fulfilled.match(result)) {
        setStepError(result.payload ?? "Could not save campaign details");
        return false;
      }
      return true;
    }

    if (!campaignId) return false;

    if (step === 1) {
      const initialResult = await dispatch(
        updateInitialOutreach({ id: campaignId, payload: { templateId: form.sequence.initialTemplateId } }),
      );
      if (!updateInitialOutreach.fulfilled.match(initialResult)) {
        setStepError(initialResult.payload ?? "Could not save the initial outreach template");
        return false;
      }

      const replyResult = await dispatch(
        updateReplyHandling({
          id: campaignId,
          payload: {
            method: form.sequence.replyMethod,
            templateId: form.sequence.replyMethod === "template" ? form.sequence.replyTemplateId : undefined,
          },
        }),
      );
      if (!updateReplyHandling.fulfilled.match(replyResult)) {
        setStepError(replyResult.payload ?? "Could not save reply handling");
        return false;
      }

      const followUpResult = await dispatch(
        updateFollowUp({
          id: campaignId,
          payload: {
            enabled: form.sequence.followUpEnabled,
            templateId: form.sequence.followUpEnabled ? form.sequence.followUpTemplateId : undefined,
            delayDays: form.sequence.followUpEnabled
              ? Number.parseInt(form.sequence.followUpDelayDays, 10)
              : undefined,
          },
        }),
      );
      if (!updateFollowUp.fulfilled.match(followUpResult)) {
        setStepError(followUpResult.payload ?? "Could not save the follow-up step");
        return false;
      }

      return true;
    }

    if (step === 2) {
      const result = await dispatch(updateCampaignLeadList({ id: campaignId, payload: { leadListId: form.leadListId } }));
      if (!updateCampaignLeadList.fulfilled.match(result)) {
        setStepError(result.payload ?? "Could not associate this lead list");
        return false;
      }
      return true;
    }

    if (step === 3 || step === 4) {
      const result = await dispatch(
        upsertCampaignSchedule({
          id: campaignId,
          payload: {
            startTime: form.schedule.startTime,
            endTime: form.schedule.endTime,
            weekdays: form.schedule.weekdays,
            timeZone: form.schedule.timeZone,
          },
        }),
      );
      if (!upsertCampaignSchedule.fulfilled.match(result)) {
        setStepError(result.payload ?? "Could not save the schedule");
        return false;
      }
      return true;
    }

    return true;
  };

  const goNext = async () => {
    if (!validate(currentStep)) return;
    setStepError(null);

    const persisted = await persistStep(currentStep);
    if (!persisted) return;

    // Step 0 on a brand-new campaign navigates to /campaigns/:id instead —
    // the remount there recomputes currentStep from the server, so nothing
    // to advance locally.
    if (currentStep === 0 && mode === "new" && !campaignId) return;

    setFurthestStep((current) => Math.max(current, Math.min(STEPS.length - 1, currentStep + 1)));
    setCurrentStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const goBack = () => {
    setStepError(null);
    setCurrentStep((current) => Math.max(0, current - 1));
  };

  const openTemplateEditor = () => {
    if (!selectedInitialTemplate) return;
    setEditingTemplateId(selectedInitialTemplate.id);
    setTemplateDraft({
      subject: selectedInitialTemplate.subject,
      bodyHtml: selectedInitialTemplate.bodyHtml,
    });
  };

  const cancelTemplateEdit = () => {
    setEditingTemplateId(null);
    setTemplateDraft(null);
  };

  const saveTemplateEdit = async () => {
    if (!selectedTemplateForEdit || !templateDraft) return;
    const result = await dispatch(
      updateTemplate({
        id: selectedTemplateForEdit.id,
        payload: {
          subject: templateDraft.subject,
          bodyHtml: templateDraft.bodyHtml,
        },
      }),
    );

    if (updateTemplate.fulfilled.match(result)) {
      setEditingTemplateId(null);
      setTemplateDraft(null);
    }
  };

  const submitCampaign = async (submissionMode: SubmissionMode) => {
    if (!validate("all") || !campaignId) return;
    setStepError(null);

    const result = await dispatch(
      finalizeCampaign({ id: campaignId, payload: { mode: submissionMode === "draft" ? "draft" : "launch" } }),
    );

    if (!finalizeCampaign.fulfilled.match(result)) {
      setStepError(result.payload ?? "Could not save this campaign");
      return;
    }

    if (submissionMode === "launch") {
      router.push("/dashboard/campaigns");
      return;
    }

    setSubmission({ mode: submissionMode, at: new Date().toISOString() });
    setFurthestStep(STEPS.length - 1);
    setCurrentStep(STEPS.length - 1);
  };

  const timezoneLabel = form.schedule.timeZone || "Not selected";
  const isSavingTemplate = templateSaveStatus === "loading";
  const isSavingStep = saveStatus === "loading";
  const isFinalizing = finalizeStatus === "loading";
  const isLoadingExisting = useMinLoadingDuration(mode === "edit" && campaignStatus === "loading" && !campaign);
  const isTemplatesLoading = useMinLoadingDuration(templatesStatus === "loading" && templates.length === 0);
  const isLeadListsLoading = useMinLoadingDuration(leadListsStatus === "loading" && leadLists.length === 0);
  const isLastStep = currentStep === STEPS.length - 1;

  const activeBanner = (
    stepError ||
    saveError ||
    finalizeError ||
    templatesError ||
    leadListsError ||
    templateSaveError ||
    (submission
      ? `Campaign ${submission.mode === "draft" ? "saved as draft" : "marked as ready to launch"} at ${formatDate(submission.at)}.`
      : null)
  ) as string | null;

  const activeBannerTone = submission && !stepError && !saveError && !finalizeError && !templatesError && !leadListsError && !templateSaveError
    ? "success"
    : "destructive";

  if (mode === "edit" && campaignStatus === "failed") {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-background px-6">
        <EmptyState
          icon={CircleAlert}
          title="Couldn't load this campaign"
          description={campaignError ?? "It may have been deleted, or you may not have access to it."}
          action={
            <Button type="button" asChild>
              <Link href="/dashboard/campaigns">Back to Campaigns</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoadingExisting) {
    return (
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden bg-card lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden border-r border-border/70 p-3 lg:block">
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="space-y-4 p-8">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="mt-6 h-64 w-full max-w-3xl rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full overflow-hidden bg-card">
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)]">
        <StepsSidebar
          campaignName={form.name}
          currentStep={currentStep}
          furthestStep={furthestStep}
          onStepSelect={handleStepSelect}
          onBack={goBack}
          backDisabled={currentStep === 0}
        />

        <section className="flex min-h-0 flex-col overflow-hidden bg-background">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-4">
            <Button type="button" variant="ghost" size="icon" className="-ml-1.5 h-8 w-8 rounded-lg" asChild>
              <Link href="/dashboard/campaigns" aria-label="Back to campaigns">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {activeBanner ? (
            <div className="shrink-0 px-6 pt-3 lg:px-10">
              <p
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-small leading-5",
                  activeBannerTone === "success"
                    ? "border-success/25 bg-success/10 text-success"
                    : "border-destructive/25 bg-destructive/5 text-destructive",
                )}
              >
                {activeBannerTone === "success" ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{activeBanner}</span>
              </p>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
            <div className="mx-auto w-full max-w-3xl space-y-8">
              {currentStep === 0 ? (
                <div className="grid gap-5">
                  <div className="space-y-1.5">
                    <CompactLabel>Campaign Name *</CompactLabel>
                    <Input
                      value={form.name}
                      onChange={(event) => {
                        updateForm("name", event.target.value);
                        if (validationErrors.name) setValidationErrors((current) => ({ ...current, name: undefined }));
                      }}
                      placeholder="e.g. Q3 founder outreach"
                      className="h-9"
                      aria-invalid={Boolean(validationErrors.name)}
                    />
                    <FieldError message={validationErrors.name} />
                  </div>

                  <div className="space-y-1.5">
                    <CompactLabel>Description</CompactLabel>
                    <Textarea
                      value={form.description}
                      onChange={(event) => updateForm("description", event.target.value)}
                      placeholder="A short description of who this campaign reaches and why it exists."
                      className="min-h-28"
                    />
                  </div>
                </div>
              ) : null}

              {currentStep === 1 ? (
                <div className="space-y-8">
                  <StepSection
                    title="Initial Outreach"
                    description="Select the starting template, then expand and edit it inline if needed."
                    divider={false}
                  >
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <CompactLabel>Email Template *</CompactLabel>
                        <Select
                          value={form.sequence.initialTemplateId}
                          onValueChange={(value) => {
                            updateSequence({ initialTemplateId: value });
                            if (validationErrors.initialTemplateId) {
                              setValidationErrors((current) => ({ ...current, initialTemplateId: undefined }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={templatesStatus === "loading" ? "Loading templates..." : "Select a template"} />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError message={validationErrors.initialTemplateId} />
                      </div>

                      {isTemplatesLoading ? (
                        <Skeleton className="h-9 w-full rounded-md" />
                      ) : templates.length === 0 ? (
                        <EmptyState
                          icon={Send}
                          title="No templates yet"
                          description="Create a template first."
                          action={
                            <Button type="button" size="sm" asChild>
                              <Link href="/dashboard/templates/new">Create template</Link>
                            </Button>
                          }
                          className="py-8"
                        />
                      ) : selectedInitialTemplate ? (
                        editingTemplateId === selectedInitialTemplate.id && templateDraft ? (
                          <TemplateEditorInline
                            template={selectedInitialTemplate}
                            draft={templateDraft}
                            onDraftChange={setTemplateDraft}
                            onCancel={cancelTemplateEdit}
                            onSave={saveTemplateEdit}
                            saving={isSavingTemplate}
                          />
                        ) : (
                          <div className="space-y-3 border-t border-border/60 pt-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-caption text-muted-foreground">Preview</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 px-1 text-xs font-medium text-primary transition-colors hover:bg-accent/40 hover:text-primary"
                                onClick={openTemplateEditor}
                              >
                                Edit template
                              </Button>
                            </div>
                            <TemplatePreview template={selectedInitialTemplate} />
                          </div>
                        )
                      ) : (
                        <p className="border-t border-border/60 pt-3 text-small text-muted-foreground">
                          Select a template to preview it here.
                        </p>
                      )}
                    </div>
                  </StepSection>

                  <StepSection title="On Reply" description="Choose reply handling.">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <CompactLabel>Reply Handling</CompactLabel>
                        <Select
                          value={form.sequence.replyMethod}
                          onValueChange={(value) => {
                            updateSequence({ replyMethod: value as CampaignReplyMethod });
                            if (validationErrors.replyTemplateId) {
                              setValidationErrors((current) => ({ ...current, replyTemplateId: undefined }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="ai">AI</SelectItem>
                            <SelectItem value="template">Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {form.sequence.replyMethod === "template" ? (
                        <div className="space-y-1.5">
                          <CompactLabel>Reply Template *</CompactLabel>
                          <Select
                            value={form.sequence.replyTemplateId}
                            onValueChange={(value) => {
                              updateSequence({ replyTemplateId: value });
                              if (validationErrors.replyTemplateId) {
                                setValidationErrors((current) => ({ ...current, replyTemplateId: undefined }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select a reply template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FieldError message={validationErrors.replyTemplateId} />
                        </div>
                      ) : (
                        <p className="text-small text-muted-foreground">{form.sequence.replyMethod === "ai" ? "AI handles replies." : "Manual review only."}</p>
                      )}
                    </div>
                  </StepSection>

                  <StepSection
                    title="Follow-up"
                    description="Send a follow-up if needed."
                    action={
                      <Switch
                        checked={form.sequence.followUpEnabled}
                        onCheckedChange={(checked) => {
                          updateSequence({ followUpEnabled: checked });
                          if (validationErrors.followUpTemplateId || validationErrors.followUpDelayDays) {
                            setValidationErrors((current) => ({
                              ...current,
                              followUpTemplateId: undefined,
                              followUpDelayDays: undefined,
                            }));
                          }
                        }}
                      />
                    }
                  >
                    {form.sequence.followUpEnabled ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <CompactLabel>Follow-up Template *</CompactLabel>
                            <Select
                              value={form.sequence.followUpTemplateId}
                              onValueChange={(value) => {
                                updateSequence({ followUpTemplateId: value });
                                if (validationErrors.followUpTemplateId) {
                                  setValidationErrors((current) => ({ ...current, followUpTemplateId: undefined }));
                                }
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select a follow-up template" />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError message={validationErrors.followUpTemplateId} />
                          </div>

                          <div className="space-y-1.5">
                            <CompactLabel>Send after N days *</CompactLabel>
                            <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={form.sequence.followUpDelayDays}
                                onChange={(event) => {
                                  updateSequence({ followUpDelayDays: event.target.value });
                                  if (validationErrors.followUpDelayDays) {
                                    setValidationErrors((current) => ({ ...current, followUpDelayDays: undefined }));
                                  }
                                }}
                                className="h-9 w-28"
                                placeholder="3"
                              />
                                <span className="text-small text-muted-foreground">days later</span>
                              </div>
                            <FieldError message={validationErrors.followUpDelayDays} />
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 px-3 text-sm"
                          onClick={() => updateSequence({ followUpEnabled: false })}
                        >
                          Remove follow-up step
                        </Button>
                      </div>
                    ) : (
                      <p className="text-small text-muted-foreground">
                        Add a follow-up step to automatically continue the sequence if the lead stays silent.
                      </p>
                    )}
                  </StepSection>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <CompactLabel>Lead List *</CompactLabel>
                    <Select
                      value={form.leadListId}
                      onValueChange={(value) => {
                        updateForm("leadListId", value);
                        if (validationErrors.leadListId) {
                          setValidationErrors((current) => ({ ...current, leadListId: undefined }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={leadListsStatus === "loading" ? "Loading lead lists..." : "Select a lead list"} />
                      </SelectTrigger>
                      <SelectContent>
                        {leadLists.map((leadList) => (
                          <SelectItem key={leadList.id} value={leadList.id}>
                            {leadList.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={validationErrors.leadListId} />
                  </div>

                  {isLeadListsLoading ? (
                    <Skeleton className="h-9 w-full rounded-md" />
                  ) : leadLists.length === 0 ? (
                    <EmptyState
                      icon={Send}
                      title="No lead lists yet"
                      description="Import a lead list before launching a campaign."
                      action={
                        <Button type="button" size="sm" asChild>
                          <Link href="/dashboard">Go to Lead Lists</Link>
                        </Button>
                      }
                      className="py-8"
                    />
                  ) : selectedLeadList ? (
                    <div className="flex items-start justify-between gap-3 border-t border-border/60 pt-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{selectedLeadList.name}</p>
                        <p className="text-caption text-muted-foreground">
                          {selectedLeadList.leadCount.toLocaleString()} leads · {selectedLeadList.status}
                        </p>
                      </div>
                      <p className="shrink-0 text-caption text-muted-foreground">{formatDate(selectedLeadList.updatedAt)}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <CompactLabel>Start Time *</CompactLabel>
                      <Input
                        type="time"
                        value={form.schedule.startTime}
                        onChange={(event) => {
                          updateSchedule({ startTime: event.target.value });
                          if (validationErrors.startTime || validationErrors.endTime) {
                            setValidationErrors((current) => ({ ...current, startTime: undefined, endTime: undefined }));
                          }
                        }}
                        className="h-9"
                      />
                      <FieldError message={validationErrors.startTime} />
                    </div>

                    <div className="space-y-1.5">
                      <CompactLabel>End Time *</CompactLabel>
                      <Input
                        type="time"
                        value={form.schedule.endTime}
                        onChange={(event) => {
                          updateSchedule({ endTime: event.target.value });
                          if (validationErrors.endTime) {
                            setValidationErrors((current) => ({ ...current, endTime: undefined }));
                          }
                        }}
                        className="h-9"
                      />
                      <FieldError message={validationErrors.endTime} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <CompactLabel>Days of Week *</CompactLabel>
                      <span className="text-caption text-muted-foreground">{formatWeekdays(form.schedule.weekdays)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((day) => {
                        const active = form.schedule.weekdays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              toggleWeekday(day.value);
                              if (validationErrors.weekdays) {
                                setValidationErrors((current) => ({ ...current, weekdays: undefined }));
                              }
                            }}
                            className={cn(
                              "inline-flex h-8 items-center rounded-md border px-3 text-sm transition",
                              active
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : "border-border/70 bg-background text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <FieldError message={validationErrors.weekdays} />
                  </div>
                </div>
              ) : null}

              {currentStep === 4 ? (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <CompactLabel>Campaign Time Zone *</CompactLabel>
                    <Select
                      value={form.schedule.timeZone}
                      onValueChange={(value) => {
                        updateSchedule({ timeZone: value });
                        if (validationErrors.timeZone) {
                          setValidationErrors((current) => ({ ...current, timeZone: undefined }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select a time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptions.map((timeZone) => (
                          <SelectItem key={timeZone} value={timeZone}>
                            {timeZone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={validationErrors.timeZone} />
                  </div>

                  <div className="flex items-start gap-2 border-t border-border/60 pt-4 text-small text-muted-foreground">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{timezoneLabel}</p>
                      <p>Emails will only send during the selected scheduling window in this time zone.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {currentStep === 5 ? (
                <div className="space-y-8">
                  <ReviewSection title="Campaign Details">
                    <SummaryRow label="Name" value={form.name || "Not set"} />
                    <SummaryRow label="Description" value={form.description || "No description"} />
                  </ReviewSection>

                  <div className="border-t border-border/60 pt-8">
                    <ReviewSection title="Lead List & Schedule">
                      <SummaryRow label="Lead list" value={selectedLeadList?.name || "Not selected"} />
                      <SummaryRow
                        label="Schedule"
                        value={
                          form.schedule.startTime && form.schedule.endTime
                            ? `${form.schedule.startTime} - ${form.schedule.endTime}`
                            : "Not set"
                        }
                      />
                      <SummaryRow label="Days" value={formatWeekdays(form.schedule.weekdays)} />
                      <SummaryRow label="Time zone" value={form.schedule.timeZone || "Not selected"} />
                    </ReviewSection>
                  </div>

                  <div className="border-t border-border/60 pt-8">
                    <ReviewSection title="Outreach Sequence">
                      <SummaryRow label="Initial outreach" value={selectedInitialTemplate?.name || "Not selected"} />
                      <SummaryRow label="On reply" value={form.sequence.replyMethod} />
                      {form.sequence.replyMethod === "template" ? (
                        <SummaryRow label="Reply template" value={selectedReplyTemplate?.name || "Not selected"} />
                      ) : null}
                      <SummaryRow label="Follow-up" value={form.sequence.followUpEnabled ? "Enabled" : "Disabled"} />
                      {form.sequence.followUpEnabled ? (
                        <>
                          <SummaryRow label="Follow-up template" value={selectedFollowUpTemplate?.name || "Not selected"} />
                          <SummaryRow
                            label="Delay"
                            value={form.sequence.followUpDelayDays ? `${form.sequence.followUpDelayDays} days` : "Not set"}
                          />
                        </>
                      ) : null}
                    </ReviewSection>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end border-t border-border/70 px-6 py-3 lg:px-10">
            {isLastStep ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={isFinalizing}
                  onClick={() => void submitCampaign("draft")}
                >
                  {isFinalizing ? <Spinner size="sm" /> : <Save className="h-3.5 w-3.5" />}
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={isFinalizing}
                  onClick={() => void submitCampaign("launch")}
                >
                  {isFinalizing ? <Spinner size="sm" /> : <Send className="h-3.5 w-3.5" />}
                  Launch Campaign
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => void goNext()}
                disabled={isSavingStep}
              >
                {isSavingStep ? <Spinner size="sm" /> : null}
                Continue
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
