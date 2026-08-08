const { ApiError } = require("../utils/api-error");

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { notFoundHandler };
