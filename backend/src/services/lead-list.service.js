const { leadListRepository } = require("../repositories/lead-list.repository");
const { leadRepository } = require("../repositories/lead.repository");
const { ApiError } = require("../utils/api-error");
const { toLeadListDto, toLeadListSummaryDto } = require("../dto/lead-list/lead-list-response.dto");
const { toLeadDto } = require("../dto/lead-list/lead-response.dto");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildPagination({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

class LeadListService {
  constructor(leadLists, leads) {
    this.leadLists = leadLists;
    this.leads = leads;
  }


  async importLeadList(userId, dto) {
    const seenEmails = new Set();
    let skippedMissingEmailCount = 0;
    let skippedDuplicateCount = 0;
    const rowsToInsert = [];

    for (const lead of dto.leads) {
      const email = typeof lead.email === "string" ? lead.email.trim().toLowerCase() : "";

      if (!email || !EMAIL_REGEX.test(email)) {
        skippedMissingEmailCount += 1;
        continue;
      }

      if (seenEmails.has(email)) {
        skippedDuplicateCount += 1;
        continue;
      }

      seenEmails.add(email);
      rowsToInsert.push({ ...lead, email, userId });
    }

    if (rowsToInsert.length === 0) {
      throw ApiError.badRequest("No valid leads to import — every row was missing a valid email or was a duplicate.");
    }

    const leadList = await this.leadLists.create({
      name: dto.name,
      userId,
      uploadMetadata: dto.uploadMetadata,
      columnMapping: dto.columnMapping,
      status: "completed",
    });

    try {
      const rowsForList = rowsToInsert.map((row) => ({ ...row, leadListId: leadList._id }));
      const { insertedCount, duplicateCount } = await this.leads.insertMany(rowsForList);

      const updated = await this.leadLists.updateImportCounts(leadList._id, {
        leadCount: insertedCount,
        skippedDuplicateCount: skippedDuplicateCount + duplicateCount,
        skippedMissingEmailCount,
      });

      return toLeadListDto(updated);
    } catch (err) {
      await this.leadLists.markFailed(leadList._id);
      throw err;
    }
  }

  async listForUser(userId, { page, limit, search }) {
    const { items, total } = await this.leadLists.listForUser(userId, { page, limit, search });

    return {
      items: items.map(toLeadListSummaryDto),
      pagination: buildPagination({ page, limit, total }),
    };
  }

  async getForUser(userId, id) {
    const leadList = await this.leadLists.findByIdForUser(id, userId);

    if (!leadList) {
      throw ApiError.notFound("Lead list not found");
    }

    return toLeadListDto(leadList);
  }

  async deleteForUser(userId, id) {
    const leadList = await this.leadLists.deleteByIdForUser(id, userId);

    if (!leadList) {
      throw ApiError.notFound("Lead list not found");
    }

    await this.leads.deleteManyByListId(leadList._id);
  }

  async listLeads(userId, leadListId, query) {
    const leadList = await this.leadLists.findByIdForUser(leadListId, userId);

    if (!leadList) {
      throw ApiError.notFound("Lead list not found");
    }

    const { items, total } = await this.leads.findForList(leadListId, userId, query);

    return {
      items: items.map(toLeadDto),
      pagination: buildPagination({ page: query.page, limit: query.limit, total }),
    };
  }

  async getLead(userId, id) {
    const lead = await this.leads.findByIdForUser(id, userId);

    if (!lead) {
      throw ApiError.notFound("Lead not found");
    }

    return toLeadDto(lead);
  }
}

const leadListService = new LeadListService(leadListRepository, leadRepository);

module.exports = { LeadListService, leadListService };
