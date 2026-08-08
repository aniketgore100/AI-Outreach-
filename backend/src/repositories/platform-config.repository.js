const { PlatformConfig } = require("../models/platform-config.model");

class PlatformConfigRepository {
  async getByKey(key) {
    return PlatformConfig.findOne({ key }).lean();
  }

  async upsertDefault(key, value, description) {
    return PlatformConfig.findOneAndUpdate(
      { key },
      { $setOnInsert: { value, description } },
      { upsert: true, returnDocument: "after" }
    );
  }

  async setValue(key, value) {
    return PlatformConfig.findOneAndUpdate({ key }, { $set: { value } }, { returnDocument: "after", upsert: true });
  }
}

const platformConfigRepository = new PlatformConfigRepository();

module.exports = { PlatformConfigRepository, platformConfigRepository };
