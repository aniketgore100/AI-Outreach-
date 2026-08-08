const { templateService } = require("../services/template.service");
const { sendSuccess } = require("../utils/api-response");
const { handleControllerError } = require("../utils/handle-controller-error");

const create = async (req, res, next) => {
  try {
    const template = await templateService.create(req.user.id, req.body);
    sendSuccess(res, 201, "Template created successfully", template);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const list = async (req, res, next) => {
  try {
    const result = await templateService.list(req.user.id, req.query);
    sendSuccess(res, 200, "Templates fetched successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const getOne = async (req, res, next) => {
  try {
    const template = await templateService.getOne(req.user.id, req.params.id);
    sendSuccess(res, 200, "Template fetched successfully", template);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const update = async (req, res, next) => {
  try {
    const template = await templateService.update(req.user.id, req.params.id, req.body);
    sendSuccess(res, 200, "Template updated successfully", template);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const remove = async (req, res, next) => {
  try {
    await templateService.remove(req.user.id, req.params.id);
    sendSuccess(res, 200, "Template deleted successfully", null);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const duplicate = async (req, res, next) => {
  try {
    const template = await templateService.duplicate(req.user.id, req.params.id);
    sendSuccess(res, 201, "Template duplicated successfully", template);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const sendTest = async (req, res, next) => {
  try {
    const result = await templateService.sendTest(req.user.id, req.params.id, req.body);
    sendSuccess(res, 200, "Test email sent successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = { create, list, getOne, update, remove, duplicate, sendTest };
