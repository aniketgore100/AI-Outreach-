const { AUTH_ERROR_MESSAGES } = require("../config/constants");
const { env } = require("../config/env");
const { toUserResponseDto } = require("../dto/auth/user-response.dto");
const { refreshTokenRepository } = require("../repositories/refresh-token.repository");
const { userRepository } = require("../repositories/user.repository");
const { ApiError } = require("../utils/api-error");
const { parseDurationToMs } = require("../utils/duration.util");
const { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt.util");
const { comparePassword, hashPassword } = require("../utils/password.util");

class AuthService {

  
  constructor(users, refreshTokens) {
    this.users = users;
    this.refreshTokens = refreshTokens;
  }

  async register(dto) {
    const existing = await this.users.findByEmail(dto.email);

    if (existing) {
      throw ApiError.conflict(AUTH_ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED);
    }

    const hashedPassword = await hashPassword(dto.password);
    const user = await this.users.create({ ...dto, password: hashedPassword });

    return this.issueSession(user._id.toString(), user.email, toUserResponseDto(user));
  }

  async login(dto) {
    const user = await this.users.findByEmailWithPassword(dto.email);

    if (!user) {
      throw ApiError.unauthorized(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);

    if (!isPasswordValid) {
      throw ApiError.unauthorized(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    return this.issueSession(user._id.toString(), user.email, toUserResponseDto(user));
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      return;
    }

    await this.refreshTokens.revokeByHash(hashToken(refreshToken));
  }

  async getCurrentUser(userId) {
    const user = await this.users.findById(userId);

    if (!user) {
      throw ApiError.notFound(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return toUserResponseDto(user);
  }

  /** Also used by a future POST /auth/refresh endpoint once token rotation lands. */
  async rotateRefreshToken(rawRefreshToken) {
    let payload;

    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw ApiError.unauthorized(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
    }

    const existing = await this.refreshTokens.findValidByHash(hashToken(rawRefreshToken));

    if (!existing) {
      throw ApiError.unauthorized(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
    }

    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw ApiError.unauthorized(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
    }

    await this.refreshTokens.revokeByHash(existing.tokenHash);

    return this.issueSession(user._id.toString(), user.email, toUserResponseDto(user));
  }

  async issueSession(userId, email, user) {
    const accessToken = signAccessToken({ sub: userId, email });
    const { token: refreshToken } = signRefreshToken(userId);

    await this.refreshTokens.create({
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    });

    return { user, accessToken, refreshToken };
  }
}

const authService = new AuthService(userRepository, refreshTokenRepository);

module.exports = { AuthService, authService };
