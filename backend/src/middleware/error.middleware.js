const mongoose = require("mongoose");
const { ZodError, z } = require("zod");

const { env } = require("../config/env");
const { ApiError } = require("../utils/api-error");

/** Normalizes any thrown error into a consistent ApiError shape before responding. */
function normalizeError(err) {
  if (err instanceof ApiError) {
    return err;
  }

  if (err instanceof ZodError) {
    return ApiError.badRequest("Validation failed", z.treeifyError(err));
  }

  // MongoDB duplicate-key error (e.g. the unique index on User.email)
  if (err.code === 11000) {
    return ApiError.conflict("A record with this value already exists");
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return ApiError.badRequest("Validation failed", err.errors);
  }

  // Malformed ObjectId passed where one was expected (e.g. a bad :id param)
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid ${err.path}`);
  }

  if (err instanceof Error) {
    return ApiError.internal(err.message);
  }

  return ApiError.internal("Something went wrong");
}

function errorHandler(err, req, res, _next) {
  const apiError = normalizeError(err);

  if (!apiError.isOperational) {
    console.error(`Unhandled error [${req.method} ${req.path}]:`, err);
  } else {
    console.warn(`Request error [${req.method} ${req.path}]: ${apiError.message}`);
  }

  const body = {
    success: false,
    message: apiError.isOperational || env.isDevelopment ? apiError.message : "Internal server error",
    ...(apiError.errors ? { errors: apiError.errors } : {}),
  };

  res.status(apiError.statusCode).json(body);
}

module.exports = { errorHandler };
