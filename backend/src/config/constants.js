const COOKIE_NAMES = {
  REFRESH_TOKEN: "refreshToken",
};

const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_ALREADY_REGISTERED: "An account with this email already exists",
  UNAUTHORIZED: "Authentication required",
  INVALID_TOKEN: "Invalid or expired token",
  USER_NOT_FOUND: "User not found",
};

const STANDARD_LEAD_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "companyName",
  "jobTitle",
  "location",
  "linkedinUrl",
  "phone",
  "website",
];

const LEAD_IMPORT_LIMITS = {
  MAX_LEADS_PER_IMPORT: 20000,
};


const PLATFORM_CONFIG_KEYS = {
  MAX_GMAIL_CONNECTIONS_PER_USER: "MAX_GMAIL_CONNECTIONS_PER_USER",
};

const PLATFORM_CONFIG_DEFAULTS = {
  MAX_GMAIL_CONNECTIONS_PER_USER: 5,
};


const EMAIL_JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  SENT: "sent",
  FAILED: "failed",
  DEAD_LETTER: "dead_letter",
};

const SQS_MESSAGE_TYPES = {
  SEND_EMAIL: "send_email",
};

/** draft = still being written, active = finished and ready to use. */
const TEMPLATE_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
};

/**
 * draft = being configured, ready = fully configured and launch-ready,
 * active/paused/completed/archived are reserved for the future worker
 * that will actually run the send sequence.
 */
const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  READY: "ready",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  ARCHIVED: "archived",
};

const CAMPAIGN_EDITABLE_STATUSES = [CAMPAIGN_STATUS.DRAFT, CAMPAIGN_STATUS.READY, CAMPAIGN_STATUS.PAUSED];

const CAMPAIGN_REPLY_METHOD = {
  MANUAL: "manual",
  AI: "ai",
  TEMPLATE: "template",
};

const CAMPAIGN_WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * pending = enrolled, nothing sent yet. initial_queued/follow_up_queued =
 * the scheduler has claimed this row and created/enqueued an EmailJob for
 * that step, awaiting EmailWorker's send confirmation. initial_sent = the
 * initial email was delivered; if follow-up is enabled the row stays here
 * (with nextActionAt set) until the follow-up is due. completed/failed are
 * terminal. Whether the lead replied is tracked separately via
 * CampaignEnrollment.repliedAt, not as a status value.
 */
const ENROLLMENT_STATUS = {
  PENDING: "pending",
  INITIAL_QUEUED: "initial_queued",
  INITIAL_SENT: "initial_sent",
  FOLLOW_UP_QUEUED: "follow_up_queued",
  COMPLETED: "completed",
  FAILED: "failed",
};

const SEQUENCE_STEP = {
  INITIAL: "initial",
  FOLLOW_UP: "follow_up",
  REPLY: "reply",
};

/** open = visible in the active inbox, archived = hidden from the default view. */
const CONVERSATION_STATUS = {
  OPEN: "open",
  ARCHIVED: "archived",
};

const MESSAGE_DIRECTION = {
  OUTBOUND: "outbound",
  INBOUND: "inbound",
};

/** draft = candidates fetched, user still selecting. confirmed = user saved
 * the selection as this account's Persona Source Set. */
const PERSONA_SOURCE_SET_STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
};

const PERSONA_TIME_PERIOD_PRESET = {
  THREE_MONTHS: "3m",
  SIX_MONTHS: "6m",
  TWELVE_MONTHS: "12m",
  ALL_TIME: "all",
  CUSTOM: "custom",
};

/** Baseline server-side filters applied before a sent email is surfaced as
 * an import candidate — see email-classification.util.js. */
const PERSONA_FILTER_REASON = {
  INTERNAL_RECIPIENT: "internal_recipient",
  AUTO_GENERATED: "auto_generated",
  TOO_SHORT: "too_short",
  TOO_LONG: "too_long",
};

const PERSONA_IMPORT_LIMITS = {
  MIN_BODY_CHARS: 50,
  MAX_BODY_CHARS: 5000,
  MAX_MESSAGES_PER_IMPORT: 500,
  LOW_SELECTION_WARNING_THRESHOLD: 10,
};

module.exports = {
  COOKIE_NAMES,
  AUTH_ERROR_MESSAGES,
  STANDARD_LEAD_FIELDS,
  LEAD_IMPORT_LIMITS,
  PLATFORM_CONFIG_KEYS,
  PLATFORM_CONFIG_DEFAULTS,
  EMAIL_JOB_STATUS,
  SQS_MESSAGE_TYPES,
  TEMPLATE_STATUS,
  CAMPAIGN_STATUS,
  CAMPAIGN_EDITABLE_STATUSES,
  CAMPAIGN_REPLY_METHOD,
  CAMPAIGN_WEEKDAYS,
  CONVERSATION_STATUS,
  MESSAGE_DIRECTION,
  ENROLLMENT_STATUS,
  SEQUENCE_STEP,
  PERSONA_SOURCE_SET_STATUS,
  PERSONA_TIME_PERIOD_PRESET,
  PERSONA_FILTER_REASON,
  PERSONA_IMPORT_LIMITS,
};
