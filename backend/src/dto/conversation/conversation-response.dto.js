function leadDisplayName(lead) {
  if (!lead) return null;
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  return name || lead.email || null;
}

function toMessageDto(message) {
  return {
    id: message._id.toString(),
    direction: message.direction,
    fromEmail: message.fromEmail,
    toEmail: message.toEmail,
    subject: message.subject,
    bodyHtml: message.bodyHtml,
    bodyText: message.bodyText,
    snippet: message.snippet,
    sentAt: message.sentAt,
    readAt: message.readAt,
  };
}

function toConversationSummaryDto(conversation) {
  const lead = conversation.leadId && typeof conversation.leadId === "object" ? conversation.leadId : null;
  const campaign = conversation.campaignId && typeof conversation.campaignId === "object" ? conversation.campaignId : null;

  return {
    id: conversation._id.toString(),
    leadId: lead ? lead._id.toString() : null,
    leadName: leadDisplayName(lead),
    leadEmail: lead?.email ?? conversation.participantEmail ?? null,
    leadCompany: lead?.companyName ?? null,
    campaignId: campaign ? campaign._id.toString() : null,
    campaignName: campaign?.name ?? null,
    subject: conversation.subject,
    status: conversation.status,
    unreadCount: conversation.unreadCount,
    lastMessageAt: conversation.lastMessageAt,
    lastMessageDirection: conversation.lastMessageDirection,
    lastMessagePreview: conversation.lastMessagePreview,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function toConversationDetailDto(conversation, messages) {
  return {
    ...toConversationSummaryDto(conversation),
    messages: messages.map(toMessageDto),
  };
}

module.exports = { toMessageDto, toConversationSummaryDto, toConversationDetailDto };
