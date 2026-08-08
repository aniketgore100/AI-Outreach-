const { verifyAccessToken } = require("../utils/jwt.util");
const { ApiError } = require("../utils/api-error");

const BEARER_PREFIX = "Bearer ";

function authenticate(req, _res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(ApiError.unauthorized("Missing or malformed Authorization header"));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

module.exports = { authenticate };
