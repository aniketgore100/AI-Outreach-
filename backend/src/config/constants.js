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
};
