const { leadListService } = require("../services/lead-list.service");
const { sendSuccess } = require("../utils/api-response");
const { handleControllerError } = require("../utils/handle-controller-error");



const create = async (req, res, next) => {
  try {
    const leadList = await leadListService.importLeadList(req.user.id, req.body);
    sendSuccess(res, 201, "Lead list imported successfully", leadList);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};




const list = async (req, res, next) => {
  try {
    const result = await leadListService.listForUser(req.user.id, req.query);
    sendSuccess(res, 200, "Lead lists fetched successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};




const getOne = async (req, res, next) => {
  try {
    const leadList = await leadListService.getForUser(req.user.id, req.params.id);
    sendSuccess(res, 200, "Lead list fetched successfully", leadList);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};




const remove = async (req, res, next) => {
  try {
    await leadListService.deleteForUser(req.user.id, req.params.id);
    sendSuccess(res, 200, "Lead list deleted successfully", null);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};




const listLeads = async (req, res, next) => {
  try {
    const result = await leadListService.listLeads(req.user.id, req.params.id, req.query);
    sendSuccess(res, 200, "Leads fetched successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const getLead = async (req, res, next) => {
  try {
    const lead = await leadListService.getLead(req.user.id, req.params.leadId);
    sendSuccess(res, 200, "Lead fetched successfully", lead);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = { create, list, getOne, remove, listLeads, getLead };
