const { campaignRepository } = require("../repositories/campaign.repository");
const { campaignScheduleRepository } = require("../repositories/campaign-schedule.repository");
const { campaignEnrollmentRepository } = require("../repositories/campaign-enrollment.repository");
const { leadRepository } = require("../repositories/lead.repository");
const { templateRepository } = require("../repositories/template.repository");
const { conversationRepository } = require("../repositories/conversation.repository");
const { messageRepository } = require("../repositories/message.repository");
const { emailJobRepository } = require("../repositories/email-job.repository");
const { emailQueueService } = require("./email-queue.service");
const { campaignEnrollmentService } = require("./campaign-enrollment.service");
const { renderTemplate } = require("../utils/template.util");
const { buildCampaignIdempotencyKey } = require("../utils/campaign-job.util");
const { isWithinSendingWindow } = require("../utils/schedule-window.util");
const { env } = require("../config/env");
const { ENROLLMENT_STATUS, SEQUENCE_STEP, EMAIL_JOB_STATUS } = require("../config/constants");

const CAMPAIGN_PAGE_SIZE = 100;

/** The scheduling algorithm — deliberately separate from the poll-loop shell
 * in worker/campaign-scheduler.worker.js (same split as ConversationService
 * vs GmailSyncWorker) so the "what's due and what do I do about it" logic
 * isn't tangled with process lifecycle concerns. This service only ever
 * determines what's due and enqueues EmailJobs — actually sending remains
 * EmailWorker's job exclusively. */
class CampaignSchedulerService {
  constructor(deps) {
    this.campaigns = deps.campaignRepository;
    this.schedules = deps.campaignScheduleRepository;
    this.enrollments = deps.campaignEnrollmentRepository;
    this.leads = deps.leadRepository;
    this.templates = deps.templateRepository;
    this.conversations = deps.conversationRepository;
    this.messages = deps.messageRepository;
    this.emailJobs = deps.emailJobRepository;
    this.emailQueue = deps.emailQueueService;
    this.campaignEnrollmentService = deps.campaignEnrollmentService;
    this.batchSize = deps.batchSize;
    this.staleClaimMs = deps.staleClaimMs;
  }

  async runCycle() {
    let campaignsChecked = 0;
    let afterId = null;

    for (;;) {
      const campaigns = await this.campaigns.findActiveBatch({ afterId, limit: CAMPAIGN_PAGE_SIZE });
      if (campaigns.length === 0) break;

      for (const campaign of campaigns) {
        campaignsChecked += 1;
        try {
          await this._processCampaign(campaign);
        } catch (err) {
          console.error(`Scheduler: failed processing campaign ${campaign._id}:`, err.message);
        }
      }

      afterId = campaigns[campaigns.length - 1]._id;
      if (campaigns.length < CAMPAIGN_PAGE_SIZE) break;
    }

    if (campaignsChecked > 0) {
      console.log(`Scheduler cycle complete: ${campaignsChecked} active campaign(s) checked`);
    }
  }

  async _processCampaign(campaign) {
    const schedule = await this.schedules.findByCampaignIdForUser(campaign._id, campaign.userId);
    if (!schedule) {
      console.error(`Scheduler: active campaign ${campaign._id} has no schedule configured — skipping`);
      return;
    }

    await this._reconcileStaleClaims(campaign);

    if (isWithinSendingWindow(new Date(), schedule)) {
      await this._processDueEnrollments(campaign);
    }

    await this._checkCompletion(campaign);
  }

  // ---- Reconciliation: self-heal enrollments possibly abandoned mid-claim ----

  async _reconcileStaleClaims(campaign) {
    const staleBefore = new Date(Date.now() - this.staleClaimMs);
    const stale = await this.enrollments.findStaleQueued(campaign._id, staleBefore, this.batchSize);

    for (const enrollment of stale) {
      try {
        await this._reconcileEnrollment(enrollment);
      } catch (err) {
        console.error(`Scheduler: reconciliation failed for enrollment ${enrollment._id}:`, err.message);
      }
    }

    if (stale.length > 0) {
      console.log(`Scheduler: reconciled ${stale.length} stale-claimed enrollment(s) for campaign ${campaign._id}`);
    }
  }

  async _reconcileEnrollment(enrollment) {
    const isFollowUp = enrollment.status === ENROLLMENT_STATUS.FOLLOW_UP_QUEUED;
    const jobId = isFollowUp ? enrollment.followUpEmailJobId : enrollment.initialEmailJobId;
    const priorStatus = isFollowUp ? ENROLLMENT_STATUS.INITIAL_SENT : ENROLLMENT_STATUS.PENDING;

    if (!jobId) {
      // Claimed but the job was never created (scheduler died mid-claim) — revert and retry.
      await this.enrollments.revertClaim(enrollment._id, enrollment.status, priorStatus, new Date());
      return;
    }

    const job = await this.emailJobs.findById(jobId);
    if (!job) {
      await this.enrollments.revertClaim(enrollment._id, enrollment.status, priorStatus, new Date());
      return;
    }

    if (job.status === EMAIL_JOB_STATUS.SENT) {
      // EmailWorker's post-send hook never landed — apply it now.
      await this.campaignEnrollmentService.handleEmailSent(job);
      return;
    }

    if (job.status === EMAIL_JOB_STATUS.DEAD_LETTER) {
      await this.enrollments.markFailed(enrollment._id, job.lastError || "Email send failed permanently");
      return;
    }

    // Still queued/processing/transiently-failed — the EmailJob row exists
    // but may never have reached SQS. Re-enqueueing is safe even if it did:
    // EmailWorker's markProcessing guard makes redelivery of an
    // already-handled job a harmless no-op.
    try {
      await this.emailQueue.enqueueEmailJobs([job._id]);
    } catch (err) {
      console.error(`Scheduler: re-enqueue failed for job ${job._id}:`, err.message);
    }
  }

  // ---- Due work: claim + enqueue, bounded per campaign per cycle ----

  async _processDueEnrollments(campaign) {
    const due = await this.enrollments.findDueForCampaign(campaign._id, this.batchSize);
    if (due.length === 0) return;

    let created = 0;
    let skipped = 0;

    for (const enrollment of due) {
      try {
        const outcome = await this._processEnrollment(campaign, enrollment);
        if (outcome === "created") created += 1;
        else skipped += 1;
      } catch (err) {
        console.error(`Scheduler: failed processing enrollment ${enrollment._id}:`, err.message);
        skipped += 1;
      }
    }

    console.log(
      `Scheduler: campaign ${campaign._id} — ${due.length} enrollment(s) evaluated, ${created} job(s) created, ${skipped} skipped`
    );
  }

  async _processEnrollment(campaign, enrollment) {
    const isFollowUp = enrollment.status === ENROLLMENT_STATUS.INITIAL_SENT;
    const step = isFollowUp ? SEQUENCE_STEP.FOLLOW_UP : SEQUENCE_STEP.INITIAL;
    const toStatus = isFollowUp ? ENROLLMENT_STATUS.FOLLOW_UP_QUEUED : ENROLLMENT_STATUS.INITIAL_QUEUED;

    // Atomic compare-and-swap — this is what makes concurrent scheduler
    // instances/overlapping cycles safe against double-claiming this row.
    const claimed = await this.enrollments.claim(enrollment._id, enrollment.status, toStatus);
    if (!claimed) return "skipped";

    const templateId = isFollowUp ? campaign.sequence?.followUp?.templateId : campaign.sequence?.initialTemplateId;
    if (!templateId) {
      await this.enrollments.markFailed(claimed._id, `${step} template is not configured`);
      return "skipped";
    }

    const [lead, template] = await Promise.all([
      this.leads.findByIdForUser(enrollment.leadId, enrollment.userId),
      this.templates.findByIdForUser(templateId, enrollment.userId),
    ]);

    if (!lead || !lead.email) {
      await this.enrollments.markFailed(claimed._id, "Lead is missing or invalid");
      return "skipped";
    }

    if (!template) {
      await this.enrollments.markFailed(claimed._id, `${step} template is missing or was deleted`);
      return "skipped";
    }

    // A blank template subject/body isn't caught by the "does the template
    // exist" check above — EmailJob.subject/body are both required fields,
    // so creating the job would otherwise throw a Mongoose ValidationError
    // that isn't a duplicate-key error and would leave this enrollment
    // stuck in a *_queued state with no job ever created.
    const renderedSubject = renderTemplate(template.subject, lead);
    const renderedBody = renderTemplate(template.bodyHtml, lead);
    if (!renderedSubject.trim() || !renderedBody.trim()) {
      await this.enrollments.markFailed(claimed._id, `${step} template has an empty subject or body`);
      return "skipped";
    }

    const threading = isFollowUp && enrollment.conversationId ? await this._buildThreadingFields(enrollment) : {};

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
      sequenceStep: step,
      idempotencyKey: buildCampaignIdempotencyKey(enrollment._id, step),
      ...threading,
    };

    const job = await this.emailJobs.createOrGetExisting(candidate);

    if (isFollowUp) {
      await this.enrollments.setFollowUpJobId(claimed._id, job._id);
    } else {
      await this.enrollments.setInitialJobId(claimed._id, job._id);
    }

    try {
      await this.emailQueue.enqueueEmailJobs([job._id]);
    } catch (err) {
      // The EmailJob row exists either way; reconciliation retries the
      // enqueue on a later cycle if this attempt failed.
      console.error(`Scheduler: enqueue failed for job ${job._id} (enrollment ${enrollment._id}):`, err.message);
    }

    return "created";
  }

  async _buildThreadingFields(enrollment) {
    const conversation = await this.conversations.findByIdForUser(enrollment.conversationId, enrollment.userId);
    if (!conversation) return {};

    const latestMessage = await this.messages.findLatestForConversation(enrollment.conversationId);
    const inReplyToHeader = latestMessage?.rfc822MessageId ?? null;

    return {
      gmailThreadId: conversation.gmailThreadId,
      inReplyTo: inReplyToHeader,
      references: inReplyToHeader,
    };
  }

  // ---- Completion: runs every cycle, independent of the sending window,
  // since a reply (not just a scheduler-driven send) can be what finishes
  // off the last outstanding enrollment. ----

  async _checkCompletion(campaign) {
    const [pendingCount, totalCount] = await Promise.all([
      this.enrollments.countPendingForCampaign(campaign._id),
      this.enrollments.countTotalForCampaign(campaign._id),
    ]);

    if (totalCount > 0 && pendingCount === 0) {
      const completed = await this.campaigns.completeById(campaign._id);
      if (completed) {
        console.log(`Scheduler: campaign ${campaign._id} completed — all ${totalCount} enrollment(s) reached a terminal state`);
      }
    }
  }
}

const campaignSchedulerService = new CampaignSchedulerService({
  campaignRepository,
  campaignScheduleRepository,
  campaignEnrollmentRepository,
  leadRepository,
  templateRepository,
  conversationRepository,
  messageRepository,
  emailJobRepository,
  emailQueueService,
  campaignEnrollmentService,
  batchSize: env.SCHEDULER_ENROLLMENT_BATCH_SIZE,
  staleClaimMs: env.SCHEDULER_STALE_CLAIM_MS,
});

module.exports = { CampaignSchedulerService, campaignSchedulerService };
