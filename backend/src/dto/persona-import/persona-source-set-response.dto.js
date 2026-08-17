function toPersonaSourceSetDto(set) {
  return {
    id: set._id.toString(),
    gmailConnectionId: set.gmailConnectionId.toString(),
    status: set.status,
    timePeriod: {
      preset: set.timePeriod.preset,
      from: set.timePeriod.from,
      to: set.timePeriod.to,
    },
    candidateCount: set.candidateCount,
    selectedCount: set.selectedCount,
    confirmedAt: set.confirmedAt,
    createdAt: set.createdAt,
    updatedAt: set.updatedAt,
  };
}

module.exports = { toPersonaSourceSetDto };
