function toTemplateDto(template) {
  return {
    id: template._id.toString(),
    name: template.name,
    subject: template.subject,
    bodyHtml: template.bodyHtml,
    status: template.status,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

module.exports = { toTemplateDto };
