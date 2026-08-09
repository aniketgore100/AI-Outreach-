const { CampaignSchedule } = require("../models/campaign-schedule.model");

class CampaignScheduleRepository {
  // findOneAndUpdate + upsert is atomic on the unique campaignId index, so
  // repeated saves of the same step are safe without a manual transaction.
  async upsertForCampaign(campaignId, userId, data) {
    return CampaignSchedule.findOneAndUpdate(
      { campaignId, userId },
      { $set: { ...data, campaignId, userId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  async findByCampaignIdForUser(campaignId, userId) {
    return CampaignSchedule.findOne({ campaignId, userId }).lean();
  }

  /** Bulk lookup for list views — avoids an N+1 schedule fetch per campaign row. */
  async findManyByCampaignIdsForUser(campaignIds, userId) {
    return CampaignSchedule.find({ campaignId: { $in: campaignIds }, userId }).lean();
  }
}

const campaignScheduleRepository = new CampaignScheduleRepository();

module.exports = { CampaignScheduleRepository, campaignScheduleRepository };
