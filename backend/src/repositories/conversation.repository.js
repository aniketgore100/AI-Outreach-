const { Conversation } = require("../models/conversation.model");
const { escapeRegex } = require("../utils/regex.util");

class ConversationRepository {
  async findByThreadForConnection(gmailConnectionId, gmailThreadId) {
    return Conversation.findOne({ gmailConnectionId, gmailThreadId });
  }

  async findByIdForUser(id, userId) {
    return Conversation.findOne({ _id: id, userId });
  }

  async findDetailByIdForUser(id, userId) {
    return Conversation.findOne({ _id: id, userId })
      .populate([
        { path: "leadId", select: "firstName lastName email companyName" },
        { path: "campaignId", select: "name" },
      ])
      .lean();
  }

  /** Idempotent — a conversation exists per (connection, Gmail thread), created
   * on whichever message (outbound send or inbound reply) is processed first. */
  async findOrCreateByThread(gmailConnectionId, gmailThreadId, defaults) {
    return Conversation.findOneAndUpdate(
      { gmailConnectionId, gmailThreadId },
      { $setOnInsert: { gmailConnectionId, gmailThreadId, ...defaults } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
  }

  async applyLatestMessage(id, { sentAt, direction, preview }) {
    return Conversation.findByIdAndUpdate(
      id,
      {
        $set: {
          lastMessageAt: sentAt,
          lastMessageDirection: direction,
          lastMessagePreview: preview,
        },
        ...(direction === "inbound" ? { $inc: { unreadCount: 1 } } : {}),
      },
      { returnDocument: "after" }
    );
  }

  async listForUser(userId, { page, limit, status, search }) {
    const query = { userId };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { subject: new RegExp(escapeRegex(search), "i") },
        { participantEmail: new RegExp(escapeRegex(search), "i") },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate([
          { path: "leadId", select: "firstName lastName email companyName" },
          { path: "campaignId", select: "name" },
        ])
        .lean(),
      Conversation.countDocuments(query),
    ]);

    return { items, total };
  }

  async markRead(id, userId) {
    return Conversation.findOneAndUpdate(
      { _id: id, userId },
      { $set: { unreadCount: 0 } },
      { returnDocument: "after" }
    );
  }

  async setStatus(id, userId, status) {
    return Conversation.findOneAndUpdate({ _id: id, userId }, { $set: { status } }, { returnDocument: "after" });
  }
}

const conversationRepository = new ConversationRepository();

module.exports = { ConversationRepository, conversationRepository };
