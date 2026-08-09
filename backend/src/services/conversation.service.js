const { conversationRepository } = require("../repositories/conversation.repository");
const { messageRepository } = require("../repositories/message.repository");
const { gmailConnectionRepository } = require("../repositories/gmail-connection.repository");
const gmailService = require("./gmail.service");
const { campaignEnrollmentService } = require("./campaign-enrollment.service");
const { decryptToken } = require("../utils/token-crypto.util");
const { ApiError } = require("../utils/api-error");
const { toConversationSummaryDto, toConversationDetailDto } = require("../dto/conversation/conversation-response.dto");
const { MESSAGE_DIRECTION, CONVERSATION_STATUS } = require("../config/constants");

const EXPIRED_HISTORY_STATUS = 404;
const PREVIEW_LENGTH = 240;

function buildPagination({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function buildPreview({ bodyText, bodyHtml, snippet }) {
  if (snippet) return snippet.slice(0, PREVIEW_LENGTH);
  const text = bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]+>/g, " ") : "");
  return text.replace(/\s+/g, " ").trim().slice(0, PREVIEW_LENGTH);
}

/** Gmail's From/To headers are "Name <email>" or a bare address — normalize
 * to just the lowercased address for matching against the connection's own
 * email (to tell an outbound send from a genuine inbound reply). */
function extractEmailAddress(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/<([^>]+)>/);
  const address = (match ? match[1] : headerValue).trim().toLowerCase();
  return address || null;
}

class ConversationService {
  constructor(deps) {
    this.conversations = deps.conversationRepository;
    this.messages = deps.messageRepository;
    this.gmailConnections = deps.gmailConnectionRepository;
    this.gmail = deps.gmailService;
    // Optional — only campaign-linked sends/replies need this, and keeping it
    // injectable (rather than a hard require) avoids a service depending on
    // the whole campaign module just to read a constructor field.
    this.campaignEnrollments = deps.campaignEnrollmentService ?? null;
  }

  // ---- Outbound: called right after the email-send worker delivers a message ----

  async recordOutboundMessage({
    userId,
    gmailConnectionId,
    leadId,
    leadListId,
    campaignId,
    campaignEnrollmentId,
    fromEmail,
    toEmail,
    subject,
    bodyText,
    bodyHtml,
    gmailMessageId,
    gmailThreadId,
  }) {
    const conversation = await this.conversations.findOrCreateByThread(gmailConnectionId, gmailThreadId, {
      userId,
      leadId: leadId ?? null,
      leadListId: leadListId ?? null,
      campaignId: campaignId ?? null,
      campaignEnrollmentId: campaignEnrollmentId ?? null,
      participantEmail: toEmail,
      subject,
    });

    const sentAt = new Date();
    const preview = buildPreview({ bodyText, bodyHtml });

    const created = await this.messages.createIfNew({
      conversationId: conversation._id,
      userId,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      gmailMessageId,
      fromEmail,
      toEmail,
      subject,
      bodyText: bodyText ?? "",
      bodyHtml: bodyHtml ?? "",
      snippet: preview,
      sentAt,
    });

    if (created) {
      await this.conversations.applyLatestMessage(conversation._id, {
        sentAt,
        direction: MESSAGE_DIRECTION.OUTBOUND,
        preview,
      });
    }

    return conversation;
  }

  // ---- Inbound: called by the sync worker, once per connected Gmail account ----

  async syncConnection(connection) {
    const accessToken = decryptToken(connection.accessTokenEncrypted);
    const refreshToken = decryptToken(connection.refreshTokenEncrypted);

    if (!connection.historyId) {
      const profile = await this.gmail.getProfile({ accessToken, refreshToken });
      await this.gmailConnections.updateSyncCursor(connection._id, { historyId: String(profile.historyId) });
      return { syncedMessages: 0, bootstrapped: true };
    }

    let pageToken;
    let latestHistoryId = connection.historyId;
    let syncedMessages = 0;
    const seenMessageIds = new Set();

    try {
      do {
        const page = await this.gmail.listHistory({
          accessToken,
          refreshToken,
          startHistoryId: connection.historyId,
          pageToken,
        });

        if (page.historyId) latestHistoryId = String(page.historyId);

        for (const record of page.history ?? []) {
          for (const added of record.messagesAdded ?? []) {
            const messageId = added.message?.id;
            const threadId = added.message?.threadId;
            if (!messageId || !threadId || seenMessageIds.has(messageId)) continue;
            seenMessageIds.add(messageId);

            const processed = await this._processHistoryMessage({
              connection,
              accessToken,
              refreshToken,
              messageId,
              threadId,
            });
            if (processed) syncedMessages += 1;
          }
        }

        pageToken = page.nextPageToken;
      } while (pageToken);
    } catch (err) {
      if (this._isExpiredHistoryError(err)) {
        const profile = await this.gmail.getProfile({ accessToken, refreshToken });
        await this.gmailConnections.updateSyncCursor(connection._id, { historyId: String(profile.historyId) });
        return { syncedMessages: 0, bootstrapped: true, resynced: true };
      }
      throw err;
    }

    await this.gmailConnections.updateSyncCursor(connection._id, { historyId: latestHistoryId });
    return { syncedMessages, bootstrapped: false };
  }

  _isExpiredHistoryError(err) {
    const status = Number(err?.code ?? err?.response?.status);
    return status === EXPIRED_HISTORY_STATUS;
  }

  /** Discards anything outside a thread we started — this is what keeps sync
   * scoped to our own outreach and blind to the rest of the mailbox. */
  async _processHistoryMessage({ connection, accessToken, refreshToken, messageId, threadId }) {
    const conversation = await this.conversations.findByThreadForConnection(connection._id, threadId);
    if (!conversation) return false;

    const message = await this.gmail.getMessage({ accessToken, refreshToken, messageId });

    const fromAddress = extractEmailAddress(message.from);
    const isOutbound = Boolean(fromAddress) && fromAddress === connection.email;
    const direction = isOutbound ? MESSAGE_DIRECTION.OUTBOUND : MESSAGE_DIRECTION.INBOUND;
    const sentAt = message.internalDate ?? new Date();
    const preview = buildPreview({ bodyText: message.bodyText, bodyHtml: message.bodyHtml, snippet: message.snippet });

    const created = await this.messages.createIfNew({
      conversationId: conversation._id,
      userId: conversation.userId,
      direction,
      gmailMessageId: message.id,
      rfc822MessageId: isOutbound ? null : message.rfc822MessageId,
      fromEmail: fromAddress ?? "",
      toEmail: extractEmailAddress(message.to) ?? "",
      subject: message.subject ?? "",
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml,
      snippet: preview,
      sentAt,
    });

    if (!created) return false;

    await this.conversations.applyLatestMessage(conversation._id, { sentAt, direction, preview });

    if (direction === MESSAGE_DIRECTION.INBOUND && conversation.status === CONVERSATION_STATUS.ARCHIVED) {
      await this.conversations.setStatus(conversation._id, conversation.userId, CONVERSATION_STATUS.OPEN);
    }

    // Campaign reply detection piggybacks on this same incremental sync pass
    // — no extra scan. Best-effort: a failure here must not break inbox sync.
    if (direction === MESSAGE_DIRECTION.INBOUND && conversation.campaignId && conversation.campaignEnrollmentId && this.campaignEnrollments) {
      try {
        await this.campaignEnrollments.handleReplyDetected({
          campaignId: conversation.campaignId,
          campaignEnrollmentId: conversation.campaignEnrollmentId,
          conversationId: conversation._id,
        });
      } catch (err) {
        console.error(`Campaign reply handling failed for conversation ${conversation._id}:`, err.message);
      }
    }

    return true;
  }

  // ---- Reader-facing API ----

  async list(userId, { page, limit, status, search }) {
    const { items, total } = await this.conversations.listForUser(userId, { page, limit, status, search });
    return {
      items: items.map(toConversationSummaryDto),
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async getDetail(userId, conversationId) {
    const conversation = await this.conversations.findDetailByIdForUser(conversationId, userId);
    if (!conversation) throw ApiError.notFound("Conversation not found");

    const messages = await this.messages.listForConversation(conversationId);
    return toConversationDetailDto(conversation, messages);
  }

  async markRead(userId, conversationId) {
    const conversation = await this.conversations.markRead(conversationId, userId);
    if (!conversation) throw ApiError.notFound("Conversation not found");

    await this.messages.markConversationRead(conversationId);
    return this.getDetail(userId, conversationId);
  }

  async setArchived(userId, conversationId, archived) {
    const conversation = await this.conversations.setStatus(
      conversationId,
      userId,
      archived ? CONVERSATION_STATUS.ARCHIVED : CONVERSATION_STATUS.OPEN
    );
    if (!conversation) throw ApiError.notFound("Conversation not found");

    return this.getDetail(userId, conversationId);
  }

  async reply(userId, conversationId, { bodyHtml, bodyText }) {
    const conversation = await this.conversations.findByIdForUser(conversationId, userId);
    if (!conversation) throw ApiError.notFound("Conversation not found");

    const connection = await this.gmailConnections.findByIdForUser(conversation.gmailConnectionId, userId);
    if (!connection || connection.status !== "connected") {
      throw ApiError.badRequest("This Gmail connection is not active — reconnect it before replying");
    }

    const latest = await this.messages.findLatestForConversation(conversationId);
    const inReplyToHeader = latest?.rfc822MessageId ?? undefined;
    const subject = conversation.subject?.startsWith("Re:") ? conversation.subject : `Re: ${conversation.subject}`;

    const result = await this.gmail.sendMessage({
      accessToken: decryptToken(connection.accessTokenEncrypted),
      refreshToken: decryptToken(connection.refreshTokenEncrypted),
      to: conversation.participantEmail,
      from: connection.email,
      subject,
      text: bodyText,
      html: bodyHtml,
      threadId: conversation.gmailThreadId,
      inReplyTo: inReplyToHeader,
      references: inReplyToHeader,
    });

    const sentAt = new Date();
    const preview = buildPreview({ bodyText, bodyHtml });

    await this.messages.createIfNew({
      conversationId: conversation._id,
      userId,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      gmailMessageId: result.id,
      fromEmail: connection.email,
      toEmail: conversation.participantEmail,
      subject,
      bodyText: bodyText ?? "",
      bodyHtml: bodyHtml ?? "",
      snippet: preview,
      sentAt,
    });

    await this.conversations.applyLatestMessage(conversation._id, {
      sentAt,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      preview,
    });

    if (conversation.status === CONVERSATION_STATUS.ARCHIVED) {
      await this.conversations.setStatus(conversation._id, userId, CONVERSATION_STATUS.OPEN);
    }

    return this.getDetail(userId, conversationId);
  }
}

const conversationService = new ConversationService({
  conversationRepository,
  messageRepository,
  gmailConnectionRepository,
  gmailService,
  campaignEnrollmentService,
});

module.exports = { ConversationService, conversationService };
