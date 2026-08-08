function toLeadListSummaryDto(leadList) {
  return {
    id: leadList._id.toString(),
    name: leadList.name,
    leadCount: leadList.leadCount,
    status: leadList.status,
    uploadMetadata: leadList.uploadMetadata,
    createdAt: leadList.createdAt,
    updatedAt: leadList.updatedAt,
  };
}

function toLeadListDto(leadList) {
  return {
    ...toLeadListSummaryDto(leadList),
    columnMapping: leadList.columnMapping,
    skippedDuplicateCount: leadList.skippedDuplicateCount,
    skippedMissingEmailCount: leadList.skippedMissingEmailCount,
  };
}

module.exports = { toLeadListSummaryDto, toLeadListDto };
