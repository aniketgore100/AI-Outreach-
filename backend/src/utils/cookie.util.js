const { COOKIE_NAMES } = require("../config/constants");
const { env } = require("../config/env");
const { parseDurationToMs } = require("./duration.util");

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax",
  path: "/api/v1/auth",
};

function setRefreshTokenCookie(res, token) {
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, REFRESH_COOKIE_OPTIONS);
}

module.exports = { setRefreshTokenCookie, clearRefreshTokenCookie };
