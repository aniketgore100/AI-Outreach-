const { templateRepository } = require("../repositories/template.repository");
const { gmailConnectionRepository } = require("../repositories/gmail-connection.repository");
const { sendMessage } = require("./gmail.service");
const { ApiError } = require("../utils/api-error");
const { toTemplateDto } = require("../dto/template/template-response.dto");
const { renderTemplate } = require("../utils/template.util");
const { decryptToken } = require("../utils/token-crypto.util");
const { TEMPLATE_STATUS } = require("../config/constants");

function buildPagination({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Fixed stand-in lead used to render both the "Send Test Email" output and
 * (mirrored on the frontend) the live preview panel — using the same values
 * in both places is what makes the preview an honest preview. */
const SAMPLE_LEAD = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  companyName: "Acme Inc.",
  jobTitle: "VP of Sales",
  location: "San Francisco, CA",
  linkedinUrl: "https://linkedin.com/in/johndoe",
  phone: "+1 (555) 123-4567",
  website: "https://acme.com",
};

class TemplateService {
  constructor(templates, gmailConnections) {
    this.templates = templates;
    this.gmailConnections = gmailConnections;
  }

  async create(userId, dto) {
    const template = await this.templates.create({ ...dto, userId });
    return toTemplateDto(template);
  }

  async list(userId, { page, limit, search, status }) {
    const { items, total } = await this.templates.listForUser(userId, { page, limit, search, status });

    return {
      items: items.map(toTemplateDto),
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async getOne(userId, id) {
    const template = await this.templates.findByIdForUser(id, userId);

    if (!template) {
      throw ApiError.notFound("Template not found");
    }

    return toTemplateDto(template);
  }

  async update(userId, id, dto) {
    const template = await this.templates.updateByIdForUser(id, userId, dto);

    if (!template) {
      throw ApiError.notFound("Template not found");
    }

    return toTemplateDto(template);
  }

  async remove(userId, id) {
    const template = await this.templates.deleteByIdForUser(id, userId);

    if (!template) {
      throw ApiError.notFound("Template not found");
    }
  }

  async duplicate(userId, id) {
    const source = await this.templates.findByIdForUser(id, userId);

    if (!source) {
      throw ApiError.notFound("Template not found");
    }

    const copy = await this.templates.create({
      userId,
      name: `${source.name} (Copy)`,
      subject: source.subject,
      bodyHtml: source.bodyHtml,
      status: TEMPLATE_STATUS.DRAFT,
    });

    return toTemplateDto(copy);
  }

  async sendTest(userId, id, { gmailConnectionId, recipientEmail }) {
    const [template, connection] = await Promise.all([
      this.templates.findByIdForUser(id, userId),
      this.gmailConnections.findByIdForUser(gmailConnectionId, userId),
    ]);

    if (!template) {
      throw ApiError.notFound("Template not found");
    }

    if (!connection) {
      throw ApiError.notFound("Gmail connection not found");
    }

    if (connection.status !== "connected") {
      throw ApiError.badRequest("This Gmail connection is not active — reconnect it before sending");
    }

    const subject = renderTemplate(template.subject || "(No subject)", SAMPLE_LEAD);
    const html = renderTemplate(template.bodyHtml || "", SAMPLE_LEAD);

    await sendMessage({
      accessToken: decryptToken(connection.accessTokenEncrypted),
      refreshToken: decryptToken(connection.refreshTokenEncrypted),
      to: recipientEmail,
      from: connection.email,
      subject: `[Test] ${subject}`,
      html,
    });

    return { sentTo: recipientEmail, from: connection.email };
  }
}

const templateService = new TemplateService(templateRepository, gmailConnectionRepository);

module.exports = { TemplateService, templateService };
