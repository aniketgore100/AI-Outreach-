const { campaignRepository } = require("../repositories/campaign.repository");
const { campaignScheduleRepository } = require("../repositories/campaign-schedule.repository");
const { templateRepository } = require("../repositories/template.repository");
const { leadListRepository } = require("../repositories/lead-list.repository");
const { gmailConnectionRepository } = require("../repositories/gmail-connection.repository");
const { campaignEnrollmentRepository } = require("../repositories/campaign-enrollment.repository");
const { campaignEnrollmentService } = require("./campaign-enrollment.service");
const { ApiError } = require("../utils/api-error");
const { toCampaignSummaryDto, toCampaignDetailDto } = require("../dto/campaign/campaign-response.dto");
const { CAMPAIGN_STATUS, CAMPAIGN_REPLY_METHOD, CAMPAIGN_EDITABLE_STATUSES } = require("../config/constants");

function buildPagination({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

class CampaignService {
  constructor(campaigns, schedules, templates, leadLists, gmailConnections, enrollments, enrollmentService) {
    this.campaigns = campaigns;
    this.schedules = schedules;
    this.templates = templates;
    this.leadLists = leadLists;
    this.gmailConnections = gmailConnections;
    this.enrollments = enrollments;
    this.enrollmentService = enrollmentService;
  }

  async _getOwnedCampaign(userId, campaignId) {
    const campaign = await this.campaigns.findByIdForUser(campaignId, userId);

    if (!campaign) {
      throw ApiError.notFound("Campaign not found");
    }

    return campaign;
  }

  _assertEditable(campaign) {
    if (!CAMPAIGN_EDITABLE_STATUSES.includes(campaign.status)) {
      throw ApiError.conflict("This campaign can no longer be edited in its current status");
    }
  }

  async _assertTemplateOwned(userId, templateId, label) {
    const template = await this.templates.findByIdForUser(templateId, userId);

    if (!template) {
      throw ApiError.notFound(`${label} not found`);
    }

    return template;
  }

  async _getDetail(userId, campaignId) {
    const [campaign, schedule] = await Promise.all([
      this.campaigns.findDetailByIdForUser(campaignId, userId),
      this.schedules.findByCampaignIdForUser(campaignId, userId),
    ]);

    if (!campaign) {
      throw ApiError.notFound("Campaign not found");
    }

    return toCampaignDetailDto(campaign, schedule);
  }

  async create(userId, dto) {
    const campaign = await this.campaigns.create({
      userId,
      name: dto.name,
      description: dto.description,
      status: CAMPAIGN_STATUS.DRAFT,
    });

    return this._getDetail(userId, campaign._id);
  }

  async list(userId, { page, limit, search, status }) {
    const { items, total } = await this.campaigns.listForUser(userId, { page, limit, search, status });

    const schedules = items.length
      ? await this.schedules.findManyByCampaignIdsForUser(items.map((item) => item._id), userId)
      : [];
    const scheduleByCampaignId = new Map(schedules.map((schedule) => [schedule.campaignId.toString(), schedule]));

    return {
      items: items.map((item) => toCampaignSummaryDto(item, scheduleByCampaignId.get(item._id.toString()))),
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async getDetail(userId, campaignId) {
    return this._getDetail(userId, campaignId);
  }

  async updateDetails(userId, campaignId, dto) {
    const campaign = await this._getOwnedCampaign(userId, campaignId);
    this._assertEditable(campaign);

    await this.campaigns.updateByIdForUser(campaignId, userId, {
      name: dto.name,
      description: dto.description,
    });

    return this._getDetail(userId, campaignId);
  }

  async updateInitialOutreach(userId, campaignId, dto) {
    const campaign = await this._getOwnedCampaign(userId, campaignId);
    this._assertEditable(campaign);
    await this._assertTemplateOwned(userId, dto.templateId, "Template");

    await this.campaigns.updateByIdForUser(campaignId, userId, {
      "sequence.initialTemplateId": dto.templateId,
    });

    return this._getDetail(userId, campaignId);
  }

  async updateReplyHandling(userId, campaignId, dto) {
    const campaign = await this._getOwnedCampaign(userId, campaignId);
    this._assertEditable(campaign);

    if (dto.method === CAMPAIGN_REPLY_METHOD.TEMPLATE) {
      await this._assertTemplateOwned(userId, dto.templateId, "Reply template");
    }

    await this.campaigns.updateByIdForUser(campaignId, userId, {
      "sequence.replyHandling.method": dto.method,
      "sequence.replyHandling.templateId": dto.method === CAMPAIGN_REPLY_METHOD.TEMPLATE ? dto.templateId : null,
    });

    return this._getDetail(userId, campaignId);
  }

  async updateFollowUp(userId, campaignId, dto) {
    const campaign = await this._getOwnedCampaign(userId, campaignId);
    this._assertEditable(campaign);

    if (dto.enabled) {
      await this._assertTemplateOwned(userId, dto.templateId, "Follow-up template");
    }

    await this.campaigns.updateByIdForUser(campaignId, userId, {
      "sequence.followUp.enabled": dto.enabled,
      "sequence.followUp.templateId": dto.enabled ? dto.templateId : null,
      "sequence.followUp.delayDays": dto.enabled ? dto.delayDays : null,
    });

    return this._getDetail(userId, campaignId);
  }

  async updateLeadList(userId, campaignId, dto) {
    const campaign = await this._getOwnedCampaign(userId, campaignId);
    this._assertEditable(campaign);

    const leadList = await this.leadLists.findByIdForUser(dto.leadListId, userId);

    if (!leadList) {
      throw ApiError.notFound("Lead list not found");
    }

    await this.campaigns.updateByIdForUser(campaignId, userId, {
      leadListId: dto.leadListId,
    });

    return this._getDetail(userId, campaignId);
  }

  async upsertSchedule(userId, campaignId, dto) {
    const campaign = await this._getOwnedCampaign(userId, campaignId);
    this._assertEditable(campaign);

    await this.schedules.upsertForCampaign(campaignId, userId, {
      startTime: dto.startTime,
      endTime: dto.endTime,
      weekdays: dto.weekdays,
      timeZone: dto.timeZone,
    });

    return this._getDetail(userId, campaignId);
  }

  async finalize(userId, campaignId, { mode }) {
    const campaign = await this._getOwnedCampaign(userId, campaignId);
    this._assertEditable(campaign);

    if (mode === "draft") {
      if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
        await this.campaigns.updateByIdForUser(campaignId, userId, { status: CAMPAIGN_STATUS.DRAFT });
      }

      return this._getDetail(userId, campaignId);
    }

    const detail = await this._getDetail(userId, campaignId);
    const missingSteps = Object.entries(detail.completedSteps)
      .filter(([, complete]) => !complete)
      .map(([step]) => step);

    if (missingSteps.length > 0) {
      throw ApiError.badRequest("Complete all configuration steps before launching this campaign", { missingSteps });
    }

    await this.campaigns.updateByIdForUser(campaignId, userId, { status: CAMPAIGN_STATUS.READY });
    return this._getDetail(userId, campaignId);
  }

  // ---- Activation lifecycle ----

  async activate(userId, campaignId) {
    const campaign = await this._getOwnedCampaign(userId, campaignId);

    if (campaign.status !== CAMPAIGN_STATUS.READY) {
      throw ApiError.conflict("Only a campaign that is ready to launch can be activated");
    }

    if (!campaign.leadListId) {
      throw ApiError.badRequest("This campaign has no lead list associated with it");
    }

    const leadList = await this.leadLists.findByIdForUser(campaign.leadListId, userId);
    if (!leadList || !leadList.leadCount) {
      throw ApiError.badRequest("This campaign's lead list has no leads to enroll");
    }

    const connection = await this.gmailConnections.findMostRecentConnectedForUser(userId);
    if (!connection) {
      throw ApiError.badRequest("Connect a Gmail account before activating this campaign");
    }

    const activated = await this.campaigns.activateForUser(campaignId, userId);
    if (!activated) {
      throw ApiError.conflict("This campaign is no longer ready to launch");
    }

    const { enrolledCount, skippedNoEmail } = await this.enrollmentService.enrollLeadList(
      activated,
      campaign.leadListId,
      connection._id
    );

    console.log(
      `Campaign ${campaignId} activated — ${enrolledCount} lead(s) enrolled, ${skippedNoEmail} skipped (no email)`
    );

    return this._getDetail(userId, campaignId);
  }

  async pause(userId, campaignId) {
    const paused = await this.campaigns.pauseForUser(campaignId, userId);
    if (!paused) {
      const campaign = await this._getOwnedCampaign(userId, campaignId);
      throw ApiError.conflict(`Cannot pause a campaign in "${campaign.status}" status`);
    }

    return this._getDetail(userId, campaignId);
  }

  async resume(userId, campaignId) {
    const resumed = await this.campaigns.resumeForUser(campaignId, userId);
    if (!resumed) {
      const campaign = await this._getOwnedCampaign(userId, campaignId);
      throw ApiError.conflict(`Cannot resume a campaign in "${campaign.status}" status`);
    }

    return this._getDetail(userId, campaignId);
  }

  async getProgress(userId, campaignId) {
    await this._getOwnedCampaign(userId, campaignId);
    return this.enrollments.countByStatusForCampaign(campaignId);
  }
}

const campaignService = new CampaignService(
  campaignRepository,
  campaignScheduleRepository,
  templateRepository,
  leadListRepository,
  gmailConnectionRepository,
  campaignEnrollmentRepository,
  campaignEnrollmentService
);

module.exports = { CampaignService, campaignService };
