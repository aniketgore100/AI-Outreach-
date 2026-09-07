const { env } = require("../config/env");
const { connectDatabase, disconnectDatabase } = require("../config/database");
const { campaignSchedulerService } = require("../services/campaign-scheduler.service");
const { CampaignSchedulerWorker } = require("./campaign-scheduler.worker");

async function bootstrap() {
  await connectDatabase();

  const worker = new CampaignSchedulerWorker({
    campaignSchedulerService,
    intervalMs: env.SCHEDULER_INTERVAL_MS,
  });

  worker.start();
  console.log(
    `Campaign scheduler started [interval=${env.SCHEDULER_INTERVAL_MS}ms, batchSize=${env.SCHEDULER_ENROLLMENT_BATCH_SIZE}]`
  );

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down campaign scheduler gracefully`);

    await worker.stop(env.SCHEDULER_SHUTDOWN_TIMEOUT_MS);
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  const forceExitOnSignal = () => {
    setTimeout(() => {
      console.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, env.SCHEDULER_SHUTDOWN_TIMEOUT_MS + 5_000).unref();
  };
  process.on("SIGTERM", forceExitOnSignal);
  process.on("SIGINT", forceExitOnSignal);

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection in campaign scheduler:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception in campaign scheduler — shutting down:", err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start campaign scheduler:", err);
  process.exit(1);
});
