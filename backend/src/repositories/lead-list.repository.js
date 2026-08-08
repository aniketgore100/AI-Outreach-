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

    // `search` has already passed Zod's z.string() check by the time it gets
    // here (see validators/lead-list.validator.js) — a query-string injection
    // attempt like ?search[$gt]= parses to an object, which Zod rejects with
    // a 400 before this ever runs, so `search` is guaranteed to be a plain,
    // length-capped, angle-bracket-free string. escapeRegex then neutralizes
    // it as a $regex pattern, so it can only ever match as a literal
    // substring — no ReDoS, no operator injection.
    // Matches only the file name (the one column the UI searches against) so
    // every result is explainable by what's on screen.
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
