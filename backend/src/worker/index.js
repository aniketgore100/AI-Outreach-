const { env } = require("../config/env");
const { connectDatabase, disconnectDatabase } = require("../config/database");
const { emailQueueService } = require("../services/email-queue.service");
const { emailJobRepository } = require("../repositories/email-job.repository");
const { gmailConnectionRepository } = require("../repositories/gmail-connection.repository");
const { sendMessage } = require("../services/gmail.service");
const { conversationService } = require("../services/conversation.service");
const { campaignEnrollmentService } = require("../services/campaign-enrollment.service");
const { EmailWorker } = require("./email.worker");
const { TokenBucketRateLimiter } = require("./rate-limiter.util");

async function bootstrap() {
  if (!env.SQS_EMAIL_QUEUE_URL) {
    console.error("SQS_EMAIL_QUEUE_URL is not configured — run scripts/setup-sqs.js first");
    process.exit(1);
  }

  await connectDatabase();

  const rateLimiter = new TokenBucketRateLimiter({ tokensPerInterval: env.WORKER_RATE_LIMIT_PER_SECOND });

  const worker = new EmailWorker({
    emailQueueService,
    emailJobRepository,
    gmailConnectionRepository,
    sendGmailMessage: sendMessage,
    recordOutboundMessage: conversationService.recordOutboundMessage.bind(conversationService),
    onCampaignEmailSent: campaignEnrollmentService.handleEmailSent.bind(campaignEnrollmentService),
    onCampaignSendFailed: campaignEnrollmentService.handleSendFailure.bind(campaignEnrollmentService),
    rateLimiter,
    concurrency: env.WORKER_CONCURRENCY,
    visibilityTimeoutSeconds: env.SQS_VISIBILITY_TIMEOUT_SECONDS,
    waitTimeSeconds: env.SQS_WAIT_TIME_SECONDS,
  });

  worker.start();
  console.log(
    `Email worker started [concurrency=${env.WORKER_CONCURRENCY}, rateLimit=${env.WORKER_RATE_LIMIT_PER_SECOND}/s, queue=${env.SQS_EMAIL_QUEUE_URL}]`
  );

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down email worker gracefully`);

    await worker.stop(env.WORKER_SHUTDOWN_TIMEOUT_MS);
    rateLimiter.stop();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  const forceExitOnSignal = () => {
    setTimeout(() => {
      console.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, env.WORKER_SHUTDOWN_TIMEOUT_MS + 5_000).unref();
  };
  process.on("SIGTERM", forceExitOnSignal);
  process.on("SIGINT", forceExitOnSignal);

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection in email worker:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception in email worker — shutting down:", err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start email worker:", err);
  process.exit(1);
});
