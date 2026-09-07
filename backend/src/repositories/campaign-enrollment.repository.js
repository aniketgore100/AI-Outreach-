const { CampaignEnrollment } = require("../models/campaign-enrollment.model");
const { ENROLLMENT_STATUS } = require("../config/constants");

const TERMINAL_STATUSES = [ENROLLMENT_STATUS.COMPLETED, ENROLLMENT_STATUS.FAILED];
const QUEUED_STATUSES = [ENROLLMENT_STATUS.INITIAL_QUEUED, ENROLLMENT_STATUS.FOLLOW_UP_QUEUED];

class CampaignEnrollmentRepository {
  async insertMany(enrollments) {
    if (enrollments.length === 0) {
      return { insertedCount: 0 };
    }

    try {
      const result = await CampaignEnrollment.insertMany(enrollments, { ordered: false });
      return { insertedCount: result.length };
    } catch (err) {
      if (err.name === "MongoBulkWriteError" || err.code === 11000) {
        const insertedCount = err.insertedDocs?.length ?? err.result?.insertedCount ?? 0;
        return { insertedCount };
      }

      throw err;
    }
  }

  /** The scheduler's core due-work query: rows whose next action is now or
   * earlier, that haven't been replied to (replies suppress follow-ups). */
  async findDueForCampaign(campaignId, limit) {
    return CampaignEnrollment.find({
      campaignId,
      status: { $in: [ENROLLMENT_STATUS.PENDING, ENROLLMENT_STATUS.INITIAL_SENT] },
      nextActionAt: { $lte: new Date() },
      repliedAt: null,
    })
      .sort({ nextActionAt: 1 })
      .limit(limit)
      .lean();
  }

  /** Atomic compare-and-swap — the sole mechanism that makes concurrent
   * scheduler instances (or overlapping cycles) safe against double-claiming
   * the same row. Returns null if another process already claimed it. */
  async claim(id, fromStatus, toStatus) {
    return CampaignEnrollment.findOneAndUpdate(
      { _id: id, status: fromStatus },
      { $set: { status: toStatus } },
      { new: true }
    );
  }

  async setInitialJobId(id, emailJobId) {
    return CampaignEnrollment.findByIdAndUpdate(id, { $set: { initialEmailJobId: emailJobId } });
  }

  async setFollowUpJobId(id, emailJobId) {
    return CampaignEnrollment.findByIdAndUpdate(id, { $set: { followUpEmailJobId: emailJobId } });
  }

  /** Applied once EmailWorker confirms the actual send. Conditioned on the
   * expected *_queued status so a stray duplicate call from reconciliation
   * can't clobber a row that's already moved on. */
  async applySendResult(id, fromStatus, { status, nextActionAt, conversationId, jobIdField, jobId }) {
    const update = { status, nextActionAt };
    // Only touch conversationId when the caller actually resolved one — the
    // reconciliation self-heal path (no fresh send result available) omits
    // it rather than clobbering whatever's already there with null.
    if (conversationId !== undefined) update.conversationId = conversationId;
    if (jobIdField) update[jobIdField] = jobId;

    return CampaignEnrollment.findOneAndUpdate(
      { _id: id, status: fromStatus },
      { $set: update },
      { new: true }
    );
  }

  async markFailed(id, error) {
    return CampaignEnrollment.findByIdAndUpdate(
      id,
      { $set: { status: ENROLLMENT_STATUS.FAILED, nextActionAt: null, lastError: String(error).slice(0, 2000) } },
      { new: true }
    );
  }

  /** Single atomic guard: the first call to reply for a given enrollment
   * wins and every subsequent (duplicate inbound sync event) is a no-op. */
  async markReplied(id) {
    return CampaignEnrollment.findOneAndUpdate(
      { _id: id, repliedAt: null },
      { $set: { repliedAt: new Date() } },
      { new: true }
    );
  }

  async setReplyJobId(id, emailJobId) {
    return CampaignEnrollment.findByIdAndUpdate(id, { $set: { replyEmailJobId: emailJobId } });
  }

  async findById(id) {
    return CampaignEnrollment.findById(id).lean();
  }

  /** Rows possibly abandoned mid-claim (scheduler crash, missed enqueue) —
   * reconciled each cycle against their linked EmailJob's real status. */
  async findStaleQueued(campaignId, beforeDate, limit) {
    return CampaignEnrollment.find({
      campaignId,
      status: { $in: QUEUED_STATUSES },
      updatedAt: { $lt: beforeDate },
    })
      .limit(limit)
      .lean();
  }

  async revertClaim(id, fromStatus, toStatus, nextActionAt) {
    return CampaignEnrollment.findOneAndUpdate(
      { _id: id, status: fromStatus },
      { $set: { status: toStatus, nextActionAt } },
      { new: true }
    );
  }

  /** Cheap indexed count used to decide campaign completion — zero
   * non-terminal, non-replied rows left means nothing more will ever be
   * scheduled for this campaign. */
  async countPendingForCampaign(campaignId) {
    return CampaignEnrollment.countDocuments({
      campaignId,
      status: { $nin: TERMINAL_STATUSES },
      repliedAt: null,
    });
  }

  async countTotalForCampaign(campaignId) {
    return CampaignEnrollment.countDocuments({ campaignId });
  }

  async countByStatusForCampaign(campaignId) {
    const [byStatus, repliedCount, total] = await Promise.all([
      CampaignEnrollment.aggregate([
        { $match: { campaignId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      CampaignEnrollment.countDocuments({ campaignId, repliedAt: { $ne: null } }),
      CampaignEnrollment.countDocuments({ campaignId }),
    ]);

    const counts = Object.fromEntries(Object.values(ENROLLMENT_STATUS).map((status) => [status, 0]));
    for (const row of byStatus) counts[row._id] = row.count;

    return { total, repliedCount, byStatus: counts };
  }
}

const campaignEnrollmentRepository = new CampaignEnrollmentRepository();

module.exports = { CampaignEnrollmentRepository, campaignEnrollmentRepository };
