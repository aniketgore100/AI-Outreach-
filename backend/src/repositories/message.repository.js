const { Message } = require("../models/message.model");

const DUPLICATE_KEY_ERROR_CODE = 11000;

class MessageRepository {
  /** Returns the created message, or null if this Gmail message was already
   * persisted (safe to call repeatedly — sync passes can overlap). */
  async createIfNew(data) {
    try {
      return await Message.create(data);
    } catch (err) {
      if (err.code === DUPLICATE_KEY_ERROR_CODE) return null;
      throw err;
    }
  }

  async listForConversation(conversationId) {
    return Message.find({ conversationId }).sort({ sentAt: 1 }).lean();
  }

  async findLatestForConversation(conversationId) {
    return Message.findOne({ conversationId }).sort({ sentAt: -1 });
  }

  async markConversationRead(conversationId) {
    return Message.updateMany(
      { conversationId, direction: "inbound", readAt: null },
      { $set: { readAt: new Date() } }
    );
  }
}

const messageRepository = new MessageRepository();

module.exports = { MessageRepository, messageRepository };
