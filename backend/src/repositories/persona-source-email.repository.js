const { PersonaSourceEmail } = require("../models/persona-source-email.model");

class PersonaSourceEmailRepository {
  async insertMany(docs) {
    if (docs.length === 0) return [];
    return PersonaSourceEmail.insertMany(docs, { ordered: false });
  }

  async listForSet(personaSourceSetId, { page, limit }) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PersonaSourceEmail.find({ personaSourceSetId }).sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
      PersonaSourceEmail.countDocuments({ personaSourceSetId }),
    ]);

    return { items, total };
  }

  async findByIdsForSet(ids, personaSourceSetId) {
    return PersonaSourceEmail.find({ _id: { $in: ids }, personaSourceSetId });
  }

  async setIncluded(id, personaSourceSetId, included) {
    return PersonaSourceEmail.findOneAndUpdate(
      { _id: id, personaSourceSetId },
      { $set: { included } },
      { new: true }
    );
  }

  async setIncludedMany(ids, personaSourceSetId, included) {
    return PersonaSourceEmail.updateMany({ _id: { $in: ids }, personaSourceSetId }, { $set: { included } });
  }

  async includeAllForSet(personaSourceSetId, included) {
    return PersonaSourceEmail.updateMany({ personaSourceSetId }, { $set: { included } });
  }

  async countIncludedForSet(personaSourceSetId) {
    return PersonaSourceEmail.countDocuments({ personaSourceSetId, included: true });
  }

  async listIncludedForSet(personaSourceSetId) {
    return PersonaSourceEmail.find({ personaSourceSetId, included: true }).sort({ sentAt: -1 }).lean();
  }
}

const personaSourceEmailRepository = new PersonaSourceEmailRepository();

module.exports = { PersonaSourceEmailRepository, personaSourceEmailRepository };
