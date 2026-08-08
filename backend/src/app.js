const compression = require("compression");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");

const { env } = require("./config/env");
const { errorHandler } = require("./middleware/error.middleware");
const { notFoundHandler } = require("./middleware/not-found.middleware");
const { v1Router } = require("./routes");
const { sendSuccess } = require("./utils/api-response");
const morgan = require("morgan");

const shouldSkipLogging = (req) => req.originalUrl.includes("/connections/google/callback") || req.originalUrl.includes("/gmail-connections/google/callback");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    morgan("dev", {
      skip: shouldSkipLogging,
    })
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(compression());

  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    sendSuccess(res, 200, "Service is healthy", { uptime: process.uptime() });
  });

  app.use(env.API_PREFIX, v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
