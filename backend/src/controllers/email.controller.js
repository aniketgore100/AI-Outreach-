const { emailService } = require("../services/email.service");
const { sendSuccess } = require("../utils/api-response");
const { handleControllerError } = require("../utils/handle-controller-error");

const sendCampaign = async (req, res, next) => {
  try {
    const result = await emailService.sendCampaign(req.user.id, req.body);
    sendSuccess(res, 202, "Emails queued for sending", result);
  } catch (err) {
    return handleControllerError(err, res, next);
  }
};

module.exports = { sendCampaign };
