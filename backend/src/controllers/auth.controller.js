const { COOKIE_NAMES } = require("../config/constants");
const { authService } = require("../services/auth.service");
const { ApiError } = require("../utils/api-error");
const { sendSuccess } = require("../utils/api-response");
const { clearRefreshTokenCookie, setRefreshTokenCookie } = require("../utils/cookie.util");
const { handleControllerError } = require("../utils/handle-controller-error");

const register = async (req, res, next) => {
  try {
    const { refreshToken, ...result } = await authService.register(req.body);

    setRefreshTokenCookie(res, refreshToken);
    sendSuccess(res, 201, "Account created successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const login = async (req, res, next) => {
  try {
    const { refreshToken, ...result } = await authService.login(req.body);

    setRefreshTokenCookie(res, refreshToken);
    sendSuccess(res, 200, "Logged in successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];

    await authService.logout(refreshToken);
    clearRefreshTokenCookie(res);
    sendSuccess(res, 200, "Logged out successfully", null);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const me = async (req, res, next) => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const user = await authService.getCurrentUser(req.user.id);
    sendSuccess(res, 200, "Current user fetched successfully", user);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];

    if (!refreshToken) {
      throw ApiError.unauthorized("Missing refresh token");
    }

    const { refreshToken: newRefreshToken, ...result } = await authService.rotateRefreshToken(refreshToken);

    setRefreshTokenCookie(res, newRefreshToken);
    sendSuccess(res, 200, "Access token refreshed successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = { register, login, logout, me, refresh };
