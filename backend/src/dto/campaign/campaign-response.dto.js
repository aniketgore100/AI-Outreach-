const { toTemplateDto } = require("../template/template-response.dto");
const { toLeadListSummaryDto } = require("../lead-list/lead-list-response.dto");
const { CAMPAIGN_REPLY_METHOD } = require("../../config/constants");

function toCampaignSummaryDto(campaign, schedule) {
  return {
    id: campaign._id.toString(),
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    leadListId: campaign.leadListId ? campaign.leadListId.toString() : null,
    startTime: schedule?.startTime ?? null,
    endTime: schedule?.endTime ?? null,
    timeZone: schedule?.timeZone ?? null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

/** `campaign` is expected to come from a populated, lean query
 * (see CampaignRepository#findDetailByIdForUser) — populated ref fields are
 * plain sub-documents here, unpopulated ones are still raw ObjectIds. */
function toCampaignDetailDto(campaign, schedule) {
  const sequence = campaign.sequence || {};
  const initialTemplate = sequence.initialTemplateId || null;
  const replyTemplate = sequence.replyHandling?.templateId || null;
  const followUpTemplate = sequence.followUp?.templateId || null;
  const leadList = campaign.leadListId || null;

  return {
    id: campaign._id.toString(),
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    completedSteps: {
      details: Boolean(campaign.name),
      sequence: Boolean(initialTemplate),
      leadList: Boolean(leadList),
      schedule: Boolean(schedule),
    },
    leadListId: leadList ? leadList._id.toString() : null,
    leadList: leadList ? toLeadListSummaryDto(leadList) : null,
    sequence: {
      initialTemplateId: initialTemplate ? initialTemplate._id.toString() : null,
      initialTemplate: initialTemplate ? toTemplateDto(initialTemplate) : null,
      replyMethod: sequence.replyHandling?.method ?? CAMPAIGN_REPLY_METHOD.MANUAL,
      replyTemplateId: replyTemplate ? replyTemplate._id.toString() : null,
      replyTemplate: replyTemplate ? toTemplateDto(replyTemplate) : null,
      followUpEnabled: Boolean(sequence.followUp?.enabled),
      followUpTemplateId: followUpTemplate ? followUpTemplate._id.toString() : null,
      followUpTemplate: followUpTemplate ? toTemplateDto(followUpTemplate) : null,
      followUpDelayDays: sequence.followUp?.delayDays ?? null,
    },
    schedule: schedule
      ? {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          weekdays: schedule.weekdays,
          timeZone: schedule.timeZone,
          updatedAt: schedule.updatedAt,
        }
      : null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

module.exports = { toCampaignSummaryDto, toCampaignDetailDto };
