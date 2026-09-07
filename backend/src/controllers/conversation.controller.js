const { conversationService } = require("../services/conversation.service");
const { sendSuccess } = require("../utils/api-response");
const { handleControllerError } = require("../utils/handle-controller-error");

const list = async (req, res, next) => {
  try {
    const result = await conversationService.list(req.user.id, req.query);
    sendSuccess(res, 200, "Conversations fetched successfully", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const getOne = async (req, res, next) => {
  try {
    const conversation = await conversationService.getDetail(req.user.id, req.params.id);
    sendSuccess(res, 200, "Conversation fetched successfully", conversation);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const reply = async (req, res, next) => {
  try {
    const conversation = await conversationService.reply(req.user.id, req.params.id, req.body);
    sendSuccess(res, 201, "Reply sent successfully", conversation);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const markRead = async (req, res, next) => {
  try {
    const conversation = await conversationService.markRead(req.user.id, req.params.id);
    sendSuccess(res, 200, "Conversation marked as read", conversation);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

const setArchived = async (req, res, next) => {
  try {
    const conversation = await conversationService.setArchived(req.user.id, req.params.id, req.body.archived);
    sendSuccess(res, 200, req.body.archived ? "Conversation archived" : "Conversation restored", conversation);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = { list, getOne, reply, markRead, setArchived };
