const { PersonaSourceSet } = require("../models/persona-source-set.model");
const { PERSONA_SOURCE_SET_STATUS } = require("../config/constants");

class PersonaSourceSetRepository {
  async create(data) {
    return PersonaSourceSet.create(data);
  }

  async findByIdForUser(id, userId) {
    return PersonaSourceSet.findOne({ _id: id, userId });
  }

  async findDraftForConnection(gmailConnectionId, userId) {
    return PersonaSourceSet.findOne({
      gmailConnectionId,
      userId,
      status: PERSONA_SOURCE_SET_STATUS.DRAFT,
    }).sort({ createdAt: -1 });
  }

  async listForConnection(gmailConnectionId, userId) {
    return PersonaSourceSet.find({ gmailConnectionId, userId }).sort({ createdAt: -1 }).lean();
  }

  async updateByIdForUser(id, userId, data) {
    return PersonaSourceSet.findOneAndUpdate({ _id: id, userId }, { $set: data }, { new: true });
  }

  async deleteByIdForUser(id, userId) {
    return PersonaSourceSet.findOneAndDelete({ _id: id, userId });
  }
}

const personaSourceSetRepository = new PersonaSourceSetRepository();

module.exports = { PersonaSourceSetRepository, personaSourceSetRepository };
