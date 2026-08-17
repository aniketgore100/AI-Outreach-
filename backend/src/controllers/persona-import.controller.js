const { personaImportService } = require("../services/persona-import.service");
const { sendSuccess } = require("../utils/api-response");
const { handleControllerError } = require("../utils/handle-controller-error");

const startImport = async (req, res, next) => {
  try {
    const set = await personaImportService.startImport(req.user.id, req.params.gmailConnectionId, req.body);
    sendSuccess(res, 201, "Sent folder import started", set);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const listSets = async (req, res, next) => {
  try {
    const sets = await personaImportService.listSets(req.user.id, req.params.gmailConnectionId);
    sendSuccess(res, 200, "Persona source sets fetched successfully", sets);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const listCandidates = async (req, res, next) => {
  try {
    const result = await personaImportService.listCandidates(req.user.id, req.params.setId, req.query);
    sendSuccess(res, 200, "Candidates fetched successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const updateSelection = async (req, res, next) => {
  try {
    const result = await personaImportService.updateSelection(req.user.id, req.params.setId, req.body);
    sendSuccess(res, 200, "Selection updated", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const confirmImport = async (req, res, next) => {
  try {
    const set = await personaImportService.confirmImport(req.user.id, req.params.setId);
    sendSuccess(res, 200, "Persona source set confirmed", set);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = { startImport, listSets, listCandidates, updateSelection, confirmImport };
