const crypto = require("node:crypto");

const { leadListRepository } = require("../repositories/lead-list.repository");
const { leadRepository } = require("../repositories/lead.repository");
const { gmailConnectionRepository } = require("../repositories/gmail-connection.repository");
const { emailJobRepository } = require("../repositories/email-job.repository");
const { emailQueueService } = require("./email-queue.service");
const { ApiError } = require("../utils/api-error");
const { renderTemplate } = require("../utils/template.util");


const LEAD_FETCH_PAGE_SIZE = 500;


function buildIdempotencyKey({ userId, leadListId, leadId, gmailConnectionId }) {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${leadListId}:${leadId}:${gmailConnectionId}`)
    .digest("hex");
}

class EmailService {
  constructor(deps) {
    this.leadListRepository = deps.leadListRepository;
    this.leadRepository = deps.leadRepository;
    this.gmailConnectionRepository = deps.gmailConnectionRepository;
    this.emailJobRepository = deps.emailJobRepository;
    this.emailQueueService = deps.emailQueueService;
  }

  async sendCampaign(userId, { leadListId, gmailConnectionId, subject, body }) {
    const [leadList, connection] = await Promise.all([
      this.leadListRepository.findByIdForUser(leadListId, userId),
      this.gmailConnectionRepository.findByIdForUser(gmailConnectionId, userId),
    ]);

    if (!leadList) {
      throw ApiError.notFound("Lead list not found");
    }

    if (!connection) {
      throw ApiError.notFound("Gmail connection not found");
    }

    if (connection.status !== "connected") {
      throw ApiError.badRequest("This Gmail connection is not active — reconnect it before sending");
    }

    const candidates = [];
    let page = 1;

    for (;;) {
      const { items } = await this.leadRepository.findForList(leadListId, userId, {
        page,
        limit: LEAD_FETCH_PAGE_SIZE,
      });

      if (items.length === 0) break;

      for (const lead of items) {
        if (!lead.email) continue;

        candidates.push({
          userId,
          gmailConnectionId,
          leadListId,
          leadId: lead._id,
          to: lead.email,
          subject: renderTemplate(subject, lead),
          body: renderTemplate(body, lead),
          idempotencyKey: buildIdempotencyKey({ userId, leadListId, leadId: lead._id, gmailConnectionId }),
        });
      }

      if (items.length < LEAD_FETCH_PAGE_SIZE) break;
      page += 1;
    }

    if (candidates.length === 0) {
      throw ApiError.badRequest("No leads with a valid email address were found in this list");
    }

    const { insertedDocs } = await this.emailJobRepository.insertMany(candidates);
    const jobIds = insertedDocs.map((doc) => doc._id);
    const enqueueResult = jobIds.length > 0 ? await this.emailQueueService.enqueueEmailJobs(jobIds) : { successCount: 0, failed: [] };

    return {
      totalLeads: candidates.length,
      alreadyQueued: candidates.length - insertedDocs.length,
      enqueued: enqueueResult.successCount,
      enqueueFailures: enqueueResult.failed.length,
    };
  }
}

const emailService = new EmailService({
  leadListRepository,
  leadRepository,
  gmailConnectionRepository,
  emailJobRepository,
  emailQueueService,
});

module.exports = { EmailService, emailService };
