const { GmailConnection } = require("../models/gmail-connection.model");

class GmailConnectionRepository {
  async countActiveForUser(userId) {
    return GmailConnection.countDocuments({ userId, status: "connected" });
  }

  async findByUserAndGoogleAccountId(userId, googleAccountId) {
    return GmailConnection.findOne({ userId, googleAccountId }).select("+accessTokenEncrypted +refreshTokenEncrypted");
  }

  async listForUser(userId) {
    return GmailConnection.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async findByIdForUser(id, userId) {
    return GmailConnection.findOne({ _id: id, userId }).select("+accessTokenEncrypted +refreshTokenEncrypted");
  }

  async create(data) {
    return GmailConnection.create(data);
  }

  async reactivate(id, data) {
    return GmailConnection.findByIdAndUpdate(
      id,
      { $set: { ...data, status: "connected", disconnectedAt: null, connectedAt: new Date() } },
      { returnDocument: "after" }
    );
  }

  async disconnect(id) {
    return GmailConnection.findByIdAndUpdate(
      id,
      { $set: { status: "disconnected", disconnectedAt: new Date() } },
      { returnDocument: "after" }
    );
  }
}

const gmailConnectionRepository = new GmailConnectionRepository();

module.exports = { GmailConnectionRepository, gmailConnectionRepository };
