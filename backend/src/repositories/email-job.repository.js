const { EmailJob } = require("../models/email-job.model");
const { EMAIL_JOB_STATUS } = require("../config/constants");

class EmailJobRepository {

  async insertMany(jobs) {
    if (jobs.length === 0) {
      return { insertedCount: 0, insertedDocs: [] };
    }

    try {
      const result = await EmailJob.insertMany(jobs, { ordered: false });
      return { insertedCount: result.length, insertedDocs: result };
    } catch (err) {
      if (err.name === "MongoBulkWriteError" || err.code === 11000) {
        const insertedDocs = err.insertedDocs ?? [];
        return { insertedCount: insertedDocs.length, insertedDocs };
      }

      throw err;
    }
  }

  async findById(id) {
    return EmailJob.findById(id);
  }

  /** Used by the campaign scheduler, which (unlike the bulk ad-hoc sender)
   * needs the job id back either way to link it onto the enrollment — so a
   * duplicate-key hit recovers the existing doc instead of being swallowed. */
  async createOrGetExisting(data) {
    try {
      return await EmailJob.create(data);
    } catch (err) {
      if (err.code === 11000) {
        return EmailJob.findOne({ idempotencyKey: data.idempotencyKey });
      }

      throw err;
    }
  }


  async markProcessing(id) {
    return EmailJob.findOneAndUpdate(
      { _id: id, status: { $in: [EMAIL_JOB_STATUS.QUEUED, EMAIL_JOB_STATUS.FAILED] } },
      { $set: { status: EMAIL_JOB_STATUS.PROCESSING, lastAttemptAt: new Date() }, $inc: { attempts: 1 } },
      { returnDocument: "after" }
    );
  }

  async markSent(id, { sqsMessageId } = {}) {
    return EmailJob.findByIdAndUpdate(
      id,
      { $set: { status: EMAIL_JOB_STATUS.SENT, sentAt: new Date(), ...(sqsMessageId ? { sqsMessageId } : {}) } },
      { returnDocument: "after" }
    );
  }

  async markFailed(id, error) {
    return EmailJob.findByIdAndUpdate(
      id,
      { $set: { status: EMAIL_JOB_STATUS.FAILED, lastError: String(error).slice(0, 2000) } },
      { returnDocument: "after" }
    );
  }

  async markDead(id, error) {
    return EmailJob.findByIdAndUpdate(
      id,
      { $set: { status: EMAIL_JOB_STATUS.DEAD_LETTER, lastError: String(error).slice(0, 2000) } },
      { returnDocument: "after" }
    );
  }
}

const emailJobRepository = new EmailJobRepository();

module.exports = { EmailJobRepository, emailJobRepository };
