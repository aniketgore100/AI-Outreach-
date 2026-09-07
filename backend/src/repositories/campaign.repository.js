const { Campaign } = require("../models/campaign.model");
const { escapeRegex } = require("../utils/regex.util");
const { CAMPAIGN_STATUS } = require("../config/constants");

const DETAIL_POPULATE = [
  { path: "sequence.initialTemplateId", select: "name subject bodyHtml status updatedAt" },
  { path: "sequence.replyHandling.templateId", select: "name subject bodyHtml status updatedAt" },
  { path: "sequence.followUp.templateId", select: "name subject bodyHtml status updatedAt" },
  { path: "leadListId", select: "name leadCount status uploadMetadata updatedAt" },
];

class CampaignRepository {
  async create(data) {
    return Campaign.create(data);
  }

  async findByIdForUser(id, userId) {
    return Campaign.findOne({ _id: id, userId }).lean();
  }

  async findDetailByIdForUser(id, userId) {
    return Campaign.findOne({ _id: id, userId }).populate(DETAIL_POPULATE).lean();
  }

  async listForUser(userId, { page, limit, search, status }) {
    const query = { userId };

    if (status) query.status = status;
    if (search) query.name = new RegExp(escapeRegex(search), "i");

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Campaign.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments(query),
    ]);

    return { items, total };
  }

  async updateByIdForUser(id, userId, data) {
    return Campaign.findOneAndUpdate(
      { _id: id, userId },
      { $set: data },
      { new: true, runValidators: true, context: "query" }
    );
  }

  // Conditional status transitions — filtering on the expected prior status
  // makes a race between two concurrent requests for the same campaign a
  // no-op for the loser instead of a double transition.
  async activateForUser(id, userId) {
    return Campaign.findOneAndUpdate(
      { _id: id, userId, status: CAMPAIGN_STATUS.READY },
      { $set: { status: CAMPAIGN_STATUS.ACTIVE } },
      { new: true }
    );
  }

  async pauseForUser(id, userId) {
    return Campaign.findOneAndUpdate(
      { _id: id, userId, status: CAMPAIGN_STATUS.ACTIVE },
      { $set: { status: CAMPAIGN_STATUS.PAUSED } },
      { new: true }
    );
  }

  async resumeForUser(id, userId) {
    return Campaign.findOneAndUpdate(
      { _id: id, userId, status: CAMPAIGN_STATUS.PAUSED },
      { $set: { status: CAMPAIGN_STATUS.ACTIVE } },
      { new: true }
    );
  }

  /** Scheduler-driven, not user-scoped — still conditioned on status:active
   * so it can't clobber a campaign a user just paused. */
  async completeById(id) {
    return Campaign.findOneAndUpdate(
      { _id: id, status: CAMPAIGN_STATUS.ACTIVE },
      { $set: { status: CAMPAIGN_STATUS.COMPLETED } },
      { new: true }
    );
  }

  /** Cursor-paginated (not skip/limit) so the scheduler can page through a
   * large number of active campaigns without an ever-growing offset scan. */
  async findActiveBatch({ afterId, limit }) {
    const query = { status: CAMPAIGN_STATUS.ACTIVE };
    if (afterId) query._id = { $gt: afterId };

    return Campaign.find(query).sort({ _id: 1 }).limit(limit).lean();
  }
}

const campaignRepository = new CampaignRepository();

module.exports = { CampaignRepository, campaignRepository };
