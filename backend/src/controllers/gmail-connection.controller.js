const { gmailConnectionService } = require("../services/gmail-connection.service");
const { env } = require("../config/env");
const { sendSuccess } = require("../utils/api-response");
const { handleControllerError } = require("../utils/handle-controller-error");

const list = async (req, res, next) => {
  try {
    const result = await gmailConnectionService.listForUser(req.user.id);
    sendSuccess(res, 200, "Gmail connections fetched successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const startGoogleOAuth = async (req, res, next) => {
  try {
    const result = await gmailConnectionService.startGoogleOAuth(req.user.id, req.body.loginHint);
    sendSuccess(res, 200, "Google OAuth URL generated successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const googleOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;
    const frontendUrl = new URL("/dashboard/connections", env.FRONTEND_URL);

    if (error) {
      frontendUrl.searchParams.set("gmailOAuthError", String(errorDescription || error));
      return res.redirect(frontendUrl.toString());
    }

    const connection = await gmailConnectionService.handleGoogleOAuthCallback(String(code || ""), String(state || ""));
    frontendUrl.searchParams.set("gmailOAuthSuccess", "1");
    frontendUrl.searchParams.set("gmailAccount", connection.email);

    return res.redirect(frontendUrl.toString());
  } catch (err) {
    const frontendUrl = new URL("/dashboard/connections", env.FRONTEND_URL);
    frontendUrl.searchParams.set("gmailOAuthError", err.message || "Google OAuth failed");
    return res.redirect(frontendUrl.toString());
  }
};

const disconnect = async (req, res, next) => {
  try {
    const connection = await gmailConnectionService.disconnect(req.user.id, req.params.id);
    sendSuccess(res, 200, "Gmail account disconnected successfully", connection);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = { list, startGoogleOAuth, googleOAuthCallback, disconnect };
