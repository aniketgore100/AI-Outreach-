function toLeadDto(lead) {
  return {
    id: lead._id.toString(),
    leadListId: lead.leadListId.toString(),
    firstName: lead.firstName ?? "",
    lastName: lead.lastName ?? "",
    email: lead.email ?? "",
    companyName: lead.companyName ?? "",
    jobTitle: lead.jobTitle ?? "",
    location: lead.location ?? "",
    linkedinUrl: lead.linkedinUrl ?? "",
    phone: lead.phone ?? "",
    website: lead.website ?? "",
    customFields: lead.customFields ?? {},
    createdAt: lead.createdAt,
  };
}

module.exports = { toLeadDto };
