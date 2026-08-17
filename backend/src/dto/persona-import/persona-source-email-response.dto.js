/** Never include a full recipient address here — only the domain is stored
 * or shown, per the PRD's privacy posture for the selection UI. */
function toPersonaSourceEmailDto(email) {
  return {
    id: email._id.toString(),
    subject: email.subject,
    snippet: email.snippet,
    recipientDomain: email.recipientDomain,
    duplicateCount: email.duplicateCount,
    sentAt: email.sentAt,
    filterReason: email.filterReason,
    included: email.included,
  };
}

/** Includes bodyText — only used when a caller needs the full candidate
 * detail (e.g. an expanded preview), not the default list view. */
function toPersonaSourceEmailDetailDto(email) {
  return {
    ...toPersonaSourceEmailDto(email),
    bodyText: email.bodyText,
  };
}

module.exports = { toPersonaSourceEmailDto, toPersonaSourceEmailDetailDto };
