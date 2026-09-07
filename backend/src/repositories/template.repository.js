const { Template } = require("../models/template.model");
const { escapeRegex } = require("../utils/regex.util");

class TemplateRepository {
  async create(data) {
    return Template.create(data);
  }

  async findByIdForUser(id, userId) {
    return Template.findOne({ _id: id, userId });
  }

  async listForUser(userId, { page, limit, search, status }) {
    const query = { userId };

    if (status) query.status = status;
    if (search) query.name = new RegExp(escapeRegex(search), "i");

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Template.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Template.countDocuments(query),
    ]);

    return { items, total };
  }

  async updateByIdForUser(id, userId, data) {
    return Template.findOneAndUpdate({ _id: id, userId }, { $set: data }, { returnDocument: "after" });
  }

  async deleteByIdForUser(id, userId) {
    return Template.findOneAndDelete({ _id: id, userId });
  }
}

const templateRepository = new TemplateRepository();

module.exports = { TemplateRepository, templateRepository };
