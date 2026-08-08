const { LeadList } = require("../models/lead-list.model");
const { escapeRegex } = require("../utils/regex.util");

class LeadListRepository {
  async create(data) {
    return LeadList.create(data);
  }

  async findByIdForUser(id, userId) {
    return LeadList.findOne({ _id: id, userId }).lean();
  }

  async listForUser(userId, { page, limit, search }) {
    const query = { userId };
    if (search) {
      query["uploadMetadata.originalFileName"] = new RegExp(escapeRegex(search), "i");
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      LeadList.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      LeadList.countDocuments(query),
    ]);

    return { items, total };
  }

  async deleteByIdForUser(id, userId) {
    return LeadList.findOneAndDelete({ _id: id, userId });
  }

  async updateImportCounts(id, { leadCount, skippedDuplicateCount, skippedMissingEmailCount }) {
    return LeadList.findByIdAndUpdate(
      id,
      { $set: { leadCount, skippedDuplicateCount, skippedMissingEmailCount } },
      { returnDocument: "after" }
    );
  }

  async markFailed(id) {
    return LeadList.findByIdAndUpdate(id, { $set: { status: "failed" } }, { returnDocument: "after" });
  }
}

const leadListRepository = new LeadListRepository();

module.exports = { LeadListRepository, leadListRepository };
