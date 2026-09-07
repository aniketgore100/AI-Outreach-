const { campaignEnrollmentRepository } = require("../repositories/campaign-enrollment.repository");
const { campaignRepository } = require("../repositories/campaign.repository");
const { leadRepository } = require("../repositories/lead.repository");
const { templateRepository } = require("../repositories/template.repository");
const { conversationRepository } = require("../repositories/conversation.repository");
const { messageRepository } = require("../repositories/message.repository");
const { emailJobRepository } = require("../repositories/email-job.repository");
const { emailQueueService } = require("./email-queue.service");
const { renderTemplate } = require("../utils/template.util");
const { buildCampaignIdempotencyKey } = require("../utils/campaign-job.util");
const { computeNextActionAt } = require("../utils/schedule-window.util");
const { env } = require("../config/env");
const { ENROLLMENT_STATUS, SEQUENCE_STEP, CAMPAIGN_REPLY_METHOD } = require("../config/constants");

const LEAD_FETCH_PAGE_SIZE = 500;

class CampaignEnrollmentService {
  constructor(deps) {
    this.enrollments = deps.campaignEnrollmentRepository;
    this.campaigns = deps.campaignRepository;
    this.leads = deps.leadRepository;
    this.templates = deps.templateRepository;
    this.conversations = deps.conversationRepository;
    this.messages = deps.messageRepository;
    this.emailJobs = deps.emailJobRepository;
    this.emailQueue = deps.emailQueueService;
  }

  // ---- Called once from CampaignService#activate ----

  async enrollLeadList(campaign, leadListId, gmailConnectionId) {
    let page = 1;
    let enrolledCount = 0;
    let skippedNoEmail = 0;
    const now = new Date();

    for (;;) {
      const { items } = await this.leads.findForList(leadListId, campaign.userId, {
        page,
        limit: LEAD_FETCH_PAGE_SIZE,
      });

      if (items.length === 0) break;

      const candidates = [];
      for (const lead of items) {
        if (!lead.email) {
          skippedNoEmail += 1;
          continue;
        }

        candidates.push({
          campaignId: campaign._id,
          userId: campaign.userId,
          leadId: lead._id,
          leadListId,
          gmailConnectionId,
          status: ENROLLMENT_STATUS.PENDING,
          nextActionAt: now,
        });
      }

      if (candidates.length > 0) {
        const { insertedCount } = await this.enrollments.insertMany(candidates);
        enrolledCount += insertedCount;
      }

      if (items.length < LEAD_FETCH_PAGE_SIZE) break;
      page += 1;
    }

    return { enrolledCount, skippedNoEmail };
  }

  // ---- Called from EmailWorker after a campaign-linked send succeeds, and
  // from the scheduler's stale-claim reconciliation (self-heal) when a job
  // is found already `sent` but its enrollment never advanced — in that
  // path `conversation` is omitted rather than guessed. ----

  async handleEmailSent(job, conversation) {
    if (job.sequenceStep === SEQUENCE_STEP.INITIAL) {
      const campaign = await this.campaigns.findByIdForUser(job.campaignId, job.userId);
      const followUp = campaign?.sequence?.followUp;
      const sentAt = new Date();

      const nextState = followUp?.enabled
        ? {
            status: ENROLLMENT_STATUS.INITIAL_SENT,
            // TESTING ONLY: SCHEDULER_FOLLOWUP_DELAY_UNIT_MS lets delayDays
            // mean "minutes" instead of "days" — remove this env override
            // (and just use the computeNextActionAt(sentAt, followUp.delayDays)
            // default) once done testing.
            nextActionAt: computeNextActionAt(sentAt, followUp.delayDays, env.SCHEDULER_FOLLOWUP_DELAY_UNIT_MS),
          }
        : { status: ENROLLMENT_STATUS.COMPLETED, nextActionAt: null };

      const updated = await this.enrollments.applySendResult(job.campaignEnrollmentId, ENROLLMENT_STATUS.INITIAL_QUEUED, {
        ...nextState,
        conversationId: conversation ? conversation._id : undefined,
        jobIdField: "initialEmailJobId",
        jobId: job._id,
      });

      if (!updated) {
        console.error(
          `Campaign enrollment ${job.campaignEnrollmentId} was not in initial_queued when initial send confirmed — left for scheduler reconciliation`
        );
      }
      return;
    }

    if (job.sequenceStep === SEQUENCE_STEP.FOLLOW_UP) {
      const updated = await this.enrollments.applySendResult(job.campaignEnrollmentId, ENROLLMENT_STATUS.FOLLOW_UP_QUEUED, {
        status: ENROLLMENT_STATUS.COMPLETED,
        nextActionAt: null,
        conversationId: conversation ? conversation._id : undefined,
        jobIdField: "followUpEmailJobId",
        jobId: job._id,
      });

      if (!updated) {
        console.error(
          `Campaign enrollment ${job.campaignEnrollmentId} was not in follow_up_queued when follow-up send confirmed — left for scheduler reconciliation`
        );
      }
      return;
    }

    if (job.sequenceStep === SEQUENCE_STEP.REPLY) {
      await this.enrollments.setReplyJobId(job.campaignEnrollmentId, job._id);
    }
  }

  async handleSendFailure(job, error) {
    await this.enrollments.markFailed(job.campaignEnrollmentId, error);
  }

  // ---- Called from ConversationService when an inbound message lands on a
  // tracked campaign thread ----

  async handleReplyDetected({ campaignId, campaignEnrollmentId, conversationId }) {
    const enrollment = await this.enrollments.markReplied(campaignEnrollmentId);
    if (!enrollment) {
      // repliedAt was already set — a duplicate inbound sync event for a
      // thread we've already processed. No-op by construction.
      return { handled: false };
    }

    console.log(`Campaign reply detected for enrollment ${campaignEnrollmentId} (campaign ${campaignId})`);

    const campaign = await this.campaigns.findByIdForUser(campaignId, enrollment.userId);
    if (campaign?.sequence?.replyHandling?.method !== CAMPAIGN_REPLY_METHOD.TEMPLATE) {
      return { handled: true, autoReplied: false };
    }

    try {
      await this._sendTemplateReply({ enrollment, campaign, conversationId });
      return { handled: true, autoReplied: true };
    } catch (err) {
      console.error(`Template reply automation failed for enrollment ${campaignEnrollmentId}:`, err.message);
      return { handled: true, autoReplied: false, error: err.message };
    }
  }

  async _sendTemplateReply({ enrollment, campaign, conversationId }) {
    const templateId = campaign.sequence.replyHandling.templateId;
    const template = templateId ? await this.templates.findByIdForUser(templateId, enrollment.userId) : null;
    if (!template) {
      throw new Error("Reply template is missing or was deleted");
    }

    const lead = await this.leads.findByIdForUser(enrollment.leadId, enrollment.userId);
    if (!lead || !lead.email) {
      throw new Error("Lead is missing or invalid");
    }

    const conversation = await this.conversations.findByIdForUser(conversationId, enrollment.userId);
    if (!conversation) {
      throw new Error("Conversation not found for reply");
    }

    const latestMessage = await this.messages.findLatestForConversation(conversationId);
    const inReplyToHeader = latestMessage?.rfc822MessageId ?? undefined;
    const subject = conversation.subject?.startsWith("Re:") ? conversation.subject : `Re: ${conversation.subject}`;

    // EmailJob.subject/body are both required — an empty template body would
    // otherwise throw a Mongoose ValidationError here instead of a clear,
    // handled failure.
    const renderedSubject = renderTemplate(subject, lead);
    const renderedBody = renderTemplate(template.bodyHtml, lead);
    if (!renderedSubject.trim() || !renderedBody.trim()) {
      throw new Error("Reply template has an empty subject or body");
    }

    const candidate = {
      userId: enrollment.userId,
      gmailConnectionId: enrollment.gmailConnectionId,
      leadListId: enrollment.leadListId,
      leadId: enrollment.leadId,
      to: lead.email,
      subject: renderedSubject,
      body: renderedBody,
      campaignId: campaign._id,
      campaignEnrollmentId: enrollment._id,
      sequenceStep: SEQUENCE_STEP.REPLY,
      gmailThreadId: conversation.gmailThreadId,
      inReplyTo: inReplyToHeader ?? null,
      references: inReplyToHeader ?? null,
      idempotencyKey: buildCampaignIdempotencyKey(enrollment._id, SEQUENCE_STEP.REPLY),
    };

    const job = await this.emailJobs.createOrGetExisting(candidate);
    await this.emailQueue.enqueueEmailJobs([job._id]);
    await this.enrollments.setReplyJobId(enrollment._id, job._id);

    console.log(`Template reply queued for enrollment ${enrollment._id} (job ${job._id})`);
  }
}

const campaignEnrollmentService = new CampaignEnrollmentService({
  campaignEnrollmentRepository,
  campaignRepository,
  leadRepository,
  templateRepository,
  conversationRepository,
  messageRepository,
  emailJobRepository,
  emailQueueService,
});

module.exports = { CampaignEnrollmentService, campaignEnrollmentService };
