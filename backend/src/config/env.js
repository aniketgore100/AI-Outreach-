require("dotenv/config");
const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  API_PREFIX: z.string().min(1).default("/api/v1"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  GMAIL_TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32, "GMAIL_TOKEN_ENCRYPTION_KEY must be at least 32 characters"),

  GOOGLE_OAUTH_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().trim().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().trim().optional(),
  GOOGLE_OAUTH_STATE_SECRET: z.string().trim().optional(),
  FRONTEND_URL: z.string().trim().default("http://localhost:3000"),

  // AWS — credentials are optional because the SDK's default provider chain
  // (IAM role, shared config, etc.) covers deployed environments; only local
  // dev without an IAM role needs these set explicitly.
  AWS_REGION: z.string().trim().min(1).default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().trim().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().trim().optional(),

  // SQS — queue URLs are optional at parse time (asserted lazily wherever
  // they're actually used, same pattern as the Google OAuth vars above) so
  // the API can boot even before the queue has been provisioned.
  SQS_EMAIL_QUEUE_URL: z.string().trim().optional(),
  SQS_EMAIL_DLQ_URL: z.string().trim().optional(),
  SQS_EMAIL_QUEUE_NAME: z.string().trim().min(1).default("outreach-email-send"),
  SQS_EMAIL_DLQ_NAME: z.string().trim().min(1).default("outreach-email-send-dlq"),
  SQS_MAX_RECEIVE_COUNT: z.coerce.number().int().positive().default(5),
  SQS_VISIBILITY_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(120),
  SQS_MESSAGE_RETENTION_SECONDS: z.coerce.number().int().positive().default(345600),
  SQS_DLQ_MESSAGE_RETENTION_SECONDS: z.coerce.number().int().positive().default(1209600),
  SQS_WAIT_TIME_SECONDS: z.coerce.number().int().min(0).max(20).default(20),

  // Worker — tune throughput/backpressure without a redeploy of the API.
  WORKER_CONCURRENCY: z.coerce.number().int().positive().max(50).default(5),
  WORKER_RATE_LIMIT_PER_SECOND: z.coerce.number().int().positive().default(5),
  WORKER_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(z.prettifyError(parsed.error));
    process.exit(1);
  }

  return parsed.data;
}

const parsedEnv = loadEnv();

const env = {
  ...parsedEnv,
  isProduction: parsedEnv.NODE_ENV === "production",
  isDevelopment: parsedEnv.NODE_ENV === "development",
  isTest: parsedEnv.NODE_ENV === "test",
};

module.exports = { env };
