const { Lead } = require("../models/lead.model");
const { escapeRegex } = require("../utils/regex.util");

class LeadRepository {
  /** ordered:false lets valid rows insert even if some collide with the
   * unique (leadListId, email) index — a defense-in-depth backstop behind
   * the in-memory dedupe already done by the service. */
  async insertMany(leads) {
    if (leads.length === 0) {
      return { insertedCount: 0, duplicateCount: 0 };
    }

    try {
      const result = await Lead.insertMany(leads, { ordered: false });
      return { insertedCount: result.length, duplicateCount: 0 };
    } catch (err) {
      if (err.name === "MongoBulkWriteError" || err.code === 11000) {
        const insertedCount = err.insertedDocs?.length ?? err.result?.insertedCount ?? 0;
        const duplicateCount = err.writeErrors?.length ?? leads.length - insertedCount;
        return { insertedCount, duplicateCount };
      }

      throw err;
    }
  }

  async findForList(leadListId, userId, { page, limit, search, companyName, jobTitle, location }) {
    const query = { leadListId, userId };

    if (companyName) query.companyName = new RegExp(escapeRegex(companyName), "i");
    if (jobTitle) query.jobTitle = new RegExp(escapeRegex(jobTitle), "i");
    if (location) query.location = new RegExp(escapeRegex(location), "i");

    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { firstName: pattern },
        { lastName: pattern },
        { email: pattern },
        { companyName: pattern },
        { jobTitle: pattern },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
      Lead.countDocuments(query),
    ]);

    return { items, total };
  }

  async findByIdForUser(id, userId) {
    return Lead.findOne({ _id: id, userId }).lean();
  }

  async deleteManyByListId(leadListId) {
    await Lead.deleteMany({ leadListId });
  }
}

const leadRepository = new LeadRepository();

module.exports = { LeadRepository, leadRepository };
