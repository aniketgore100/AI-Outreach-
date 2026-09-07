const { campaignService } = require("../services/campaign.service");
const { sendSuccess } = require("../utils/api-response");
const { handleControllerError } = require("../utils/handle-controller-error");

const create = async (req, res, next) => {
  try {
    const campaign = await campaignService.create(req.user.id, req.body);
    sendSuccess(res, 201, "Campaign created successfully", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const list = async (req, res, next) => {
  try {
    const result = await campaignService.list(req.user.id, req.query);
    sendSuccess(res, 200, "Campaigns fetched successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const getOne = async (req, res, next) => {
  try {
    const campaign = await campaignService.getDetail(req.user.id, req.params.id);
    sendSuccess(res, 200, "Campaign fetched successfully", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const updateDetails = async (req, res, next) => {
  try {
    const campaign = await campaignService.updateDetails(req.user.id, req.params.id, req.body);
    sendSuccess(res, 200, "Campaign details saved", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const updateInitialOutreach = async (req, res, next) => {
  try {
    const campaign = await campaignService.updateInitialOutreach(req.user.id, req.params.id, req.body);
    sendSuccess(res, 200, "Initial outreach template saved", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const updateReplyHandling = async (req, res, next) => {
  try {
    const campaign = await campaignService.updateReplyHandling(req.user.id, req.params.id, req.body);
    sendSuccess(res, 200, "Reply handling saved", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const updateFollowUp = async (req, res, next) => {
  try {
    const campaign = await campaignService.updateFollowUp(req.user.id, req.params.id, req.body);
    sendSuccess(res, 200, "Follow-up step saved", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const updateLeadList = async (req, res, next) => {
  try {
    const campaign = await campaignService.updateLeadList(req.user.id, req.params.id, req.body);
    sendSuccess(res, 200, "Lead list associated successfully", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const upsertSchedule = async (req, res, next) => {
  try {
    const campaign = await campaignService.upsertSchedule(req.user.id, req.params.id, req.body);
    sendSuccess(res, 200, "Schedule saved", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const finalize = async (req, res, next) => {
  try {
    const campaign = await campaignService.finalize(req.user.id, req.params.id, req.body);
    const message = req.body.mode === "launch" ? "Campaign marked as ready to launch" : "Campaign saved as draft";
    sendSuccess(res, 200, message, campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const activate = async (req, res, next) => {
  try {
    const campaign = await campaignService.activate(req.user.id, req.params.id);
    sendSuccess(res, 200, "Campaign activated", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const pause = async (req, res, next) => {
  try {
    const campaign = await campaignService.pause(req.user.id, req.params.id);
    sendSuccess(res, 200, "Campaign paused", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const resume = async (req, res, next) => {
  try {
    const campaign = await campaignService.resume(req.user.id, req.params.id);
    sendSuccess(res, 200, "Campaign resumed", campaign);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const getProgress = async (req, res, next) => {
  try {
    const progress = await campaignService.getProgress(req.user.id, req.params.id);
    sendSuccess(res, 200, "Campaign progress fetched successfully", progress);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = {
  create,
  list,
  getOne,
  updateDetails,
  updateInitialOutreach,
  updateReplyHandling,
  updateFollowUp,
  updateLeadList,
  upsertSchedule,
  finalize,
  activate,
  pause,
  resume,
  getProgress,
};
