const crypto = require("node:crypto");

/** Campaign-driven EmailJobs are keyed by enrollment+step rather than the
 * ad-hoc {userId,leadListId,leadId,gmailConnectionId} formula in
 * email.service.js — a lead can legitimately receive several campaign
 * emails (initial, follow-up, reply) over time, so the step must be part of
 * the key. Reused by both the scheduler (initial/follow-up) and the
 * reply-detection handler (reply) so repeated triggers for the same step
 * can never create a second EmailJob. */
function buildCampaignIdempotencyKey(campaignEnrollmentId, sequenceStep) {
  return crypto.createHash("sha256").update(`campaign:${campaignEnrollmentId}:${sequenceStep}`).digest("hex");
}

module.exports = { buildCampaignIdempotencyKey };
