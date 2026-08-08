const { createApp } = require("./app");
const { env } = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { platformConfigService } = require("./services/platform-config.service");

async function bootstrap() {
  await connectDatabase();
  await platformConfigService.ensureDefaults();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully`);

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    // Force-exit if connections don't close in time.
    setTimeout(() => {
      console.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception — shutting down:", err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
