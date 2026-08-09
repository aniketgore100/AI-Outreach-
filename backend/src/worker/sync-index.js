const { env } = require("../config/env");
const { connectDatabase, disconnectDatabase } = require("../config/database");
const { gmailConnectionRepository } = require("../repositories/gmail-connection.repository");
const { conversationService } = require("../services/conversation.service");
const { GmailSyncWorker } = require("./gmail-sync.worker");

async function bootstrap() {
  await connectDatabase();

  const worker = new GmailSyncWorker({
    gmailConnectionRepository,
    conversationService,
    intervalMs: env.GMAIL_SYNC_INTERVAL_MS,
  });

  worker.start();
  console.log(`Gmail sync worker started [interval=${env.GMAIL_SYNC_INTERVAL_MS}ms]`);

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down Gmail sync worker gracefully`);

    await worker.stop(env.GMAIL_SYNC_SHUTDOWN_TIMEOUT_MS);
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  const forceExitOnSignal = () => {
    setTimeout(() => {
      console.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, env.GMAIL_SYNC_SHUTDOWN_TIMEOUT_MS + 5_000).unref();
  };
  process.on("SIGTERM", forceExitOnSignal);
  process.on("SIGINT", forceExitOnSignal);

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection in Gmail sync worker:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception in Gmail sync worker — shutting down:", err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start Gmail sync worker:", err);
  process.exit(1);
});
