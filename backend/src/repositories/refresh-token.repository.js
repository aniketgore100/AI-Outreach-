const { RefreshToken } = require("../models/refresh-token.model");

class RefreshTokenRepository {
  async create(data) {
    return RefreshToken.create(data);
  }

  async findValidByHash(tokenHash) {
    return RefreshToken.findOne({ tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
  }

  async revokeByHash(tokenHash) {
    await RefreshToken.updateMany({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId) {
    await RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
  }
}

const refreshTokenRepository = new RefreshTokenRepository();

module.exports = { RefreshTokenRepository, refreshTokenRepository };
